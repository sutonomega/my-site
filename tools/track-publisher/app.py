"""Local GUI for adding a track to Echo Note."""

from datetime import date
import json
from pathlib import Path
import queue
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from catalog import DATA_DIR
from publisher import SITE_ORIGIN, make_track, new_track_id, publish

DRAFT = DATA_DIR / "track-draft.json"


class TrackForm(ttk.Frame):
    def __init__(self, root):
        super().__init__(root, padding=16)
        self.grid(sticky="nsew")
        root.columnconfigure(0, weight=1)
        root.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)
        self.rowconfigure(8, weight=1)
        self.rowconfigure(9, weight=2)
        self.events = queue.Queue()
        self.variables = {
            name: tk.StringVar(value=value)
            for name, value in {
                "audio": "", "title": "", "slug": "", "date": date.today().isoformat(),
                "tags": "", "youtube": "", "tiktok": "", "target": "galpachi@ubuntu-server",
            }.items()
        }
        fields = [
            ("audio", "MP3"),
            ("title", "曲名"),
            ("slug", "曲ID（自動）"),
            ("date", "公開日（YYYY-MM-DD）"),
            ("tags", "タグ（カンマ区切り）"),
            ("youtube", "YouTube URL（任意）"),
            ("tiktok", "TikTok URL（任意）"),
            ("target", "UbuntuのSSH接続先"),
        ]
        for row, (name, label) in enumerate(fields):
            ttk.Label(self, text=label).grid(row=row, column=0, sticky="nw", padx=(0, 12), pady=3)
            state = "readonly" if name == "slug" else "normal"
            ttk.Entry(self, textvariable=self.variables[name], state=state).grid(row=row, column=1, sticky="ew", pady=3)
        ttk.Button(self, text="選択…", command=self.choose_audio).grid(row=0, column=2, padx=(8, 0))
        self.texts = {}
        for row, (name, label, height) in enumerate(
            [("text", "紹介文（任意）", 3), ("lyrics", "歌詞（任意）", 8)], start=8
        ):
            ttk.Label(self, text=label).grid(row=row, column=0, sticky="nw", pady=4)
            box = tk.Text(self, height=height, width=50, wrap="word", undo=True)
            box.grid(row=row, column=1, columnspan=2, sticky="nsew", pady=4)
            self.texts[name] = box
        actions = ttk.Frame(self)
        actions.grid(row=10, column=1, columnspan=2, sticky="e", pady=(8, 0))
        self.new_button = ttk.Button(actions, text="新しい曲", command=self.new_track)
        self.new_button.pack(side="left", padx=5)
        ttk.Button(actions, text="下書き保存", command=self.save_draft).pack(side="left", padx=5)
        self.publish_button = ttk.Button(actions, text="プレビュー・公開…", command=self.preview)
        self.publish_button.pack(side="left")
        self.status = tk.StringVar(value="MP3を選択して、曲情報を入力してね。")
        ttk.Label(self, textvariable=self.status, wraplength=675).grid(
            row=11, column=0, columnspan=3, sticky="w", pady=(10, 0)
        )
        self.load_draft()
        self.after(100, self.poll_events)

    def new_track(self):
        if not messagebox.askyesno("新しい曲", "入力欄を空にして、新しい曲の登録を始める？", parent=self):
            return
        for name, variable in self.variables.items():
            if name != "target":
                variable.set(date.today().isoformat() if name == "date" else "")
        for box in self.texts.values():
            box.delete("1.0", "end")
        self.save_draft()
        self.status.set("新しいMP3を選択してね。")

    def choose_audio(self):
        selected = filedialog.askopenfilename(filetypes=[("MP3音源", "*.mp3")])
        if not selected:
            return
        self.variables["audio"].set(selected)
        title = self.variables["title"]
        if not title.get().strip():
            title.set(Path(selected).stem)
        self.ensure_track_id()

    def ensure_track_id(self):
        slug = self.variables["slug"]
        if not slug.get():
            slug.set(new_track_id())

    def values(self):
        return {
            **{name: variable.get() for name, variable in self.variables.items()},
            **{name: box.get("1.0", "end-1c") for name, box in self.texts.items()},
        }

    def load_draft(self):
        try:
            data = json.loads(DRAFT.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return
        except (OSError, ValueError):
            self.status.set("下書きを読み込めなかったよ。新しい入力を始められるよ。")
            return
        if not isinstance(data, dict):
            return
        for name, value in data.items():
            if not isinstance(value, str):
                continue
            if name in self.variables:
                self.variables[name].set(value)
            elif name in self.texts:
                self.texts[name].insert("1.0", value)

    def save_draft(self):
        temp = DRAFT.with_suffix(".tmp")
        try:
            DRAFT.parent.mkdir(parents=True, exist_ok=True)
            temp.write_text(json.dumps(self.values(), ensure_ascii=False, indent=2), encoding="utf-8")
            temp.replace(DRAFT)
        except OSError as error:
            messagebox.showerror("下書きを保存できません", str(error), parent=self)
        else:
            self.status.set("下書きを保存したよ。")

    def preview(self):
        self.ensure_track_id()
        try:
            track = make_track(self.values())
        except (ValueError, OSError) as error:
            messagebox.showerror("入力を確認", str(error), parent=self)
            return
        dialog = tk.Toplevel(self)
        dialog.title("公開プレビュー")
        dialog.transient(self.winfo_toplevel())
        dialog.grab_set()
        work = track.work
        lines = [
            work["title"],
            f"公開日　{work['date']}",
            f"タグ　{' / '.join(work['tags']) or 'なし'}",
            f"曲ページ　{SITE_ORIGIN}/?slug={track.work['id']}",
            f"音源　{track.audio.name}",
            f"転送先　{track.target}",
            *[work[key] for key in ("youtube", "tiktok") if work[key]],
            "",
            work["text"],
            "",
            track.lyrics or "歌詞はまだ公開されていません。",
        ]
        view = tk.Text(dialog, width=75, height=21, wrap="word")
        view.pack(fill="both", expand=True, padx=12, pady=12)
        view.insert("1.0", "\n".join(lines))
        view.configure(state="disabled")
        buttons = ttk.Frame(dialog, padding=(12, 0, 12, 12))
        buttons.pack(anchor="e")
        ttk.Button(buttons, text="入力に戻る", command=dialog.destroy).pack(side="left", padx=6)
        ttk.Button(buttons, text="公開する", command=lambda: self.begin_publish(dialog, track)).pack(side="left")

    def begin_publish(self, dialog, track):
        dialog.destroy()
        self.save_draft()
        self.publish_button.state(["disabled"])
        self.new_button.state(["disabled"])
        self.status.set("公開の準備中…")
        threading.Thread(target=self.publish_track, args=(track,), daemon=False).start()

    def publish_track(self, track):
        try:
            commit = publish(track, lambda status: self.events.put(("status", status)))
        except Exception as error:
            self.events.put(("error", f"{error}\n\n原因を解消したら、同じ曲ID・音源で再試行できるよ。"))
        else:
            self.events.put(("success", f"GitHubへの登録が完了したよ。GitHub Pagesの反映後に開けるURL\n{SITE_ORIGIN}/?slug={track.work['id']}\nコミット {commit[:12]}"))

    def poll_events(self):
        while not self.events.empty():
            kind, message = self.events.get_nowait()
            if kind == "status":
                self.status.set(message)
            else:
                self.publish_button.state(["!disabled"])
                self.new_button.state(["!disabled"])
                self.status.set("GitHubに登録したよ。" if kind == "success" else "公開処理が途中で止まったよ。")
                if kind == "success":
                    messagebox.showinfo("登録完了", message, parent=self)
                else:
                    messagebox.showerror("公開処理の結果", message, parent=self)
        self.after(100, self.poll_events)


if __name__ == "__main__":
    window = tk.Tk()
    window.title("Echo Note 曲の登録")
    window.minsize(720, 565)
    TrackForm(window)
    window.mainloop()
