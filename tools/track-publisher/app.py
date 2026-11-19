"""Local GUI for adding and editing Echo Note tracks."""

from datetime import date
import json
from pathlib import Path
import queue
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from catalog import DATA_DIR
from publisher import (
    edit_fields, load_track_revision, make_track, make_track_edit, new_track_id,
    publish, publish_edit, read_snapshot,
)
from settings import SITE
from urllib.parse import urlencode

DRAFT = DATA_DIR / "track-draft.json"


def public_track_url(track):
    query = urlencode({SITE["trackQuery"]: track.work["id"]})
    return f"{SITE['siteOrigin']}/?{query}"


class TrackForm(ttk.Frame):
    def __init__(self, root, original=None):
        super().__init__(root, padding=16)
        self.grid(sticky="nsew")
        self.original = original
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
        if original:
            fields = [(name, "曲ID" if name == "slug" else label)
                      for name, label in fields if name not in {"audio", "target"}]
        for row, (name, label) in enumerate(fields):
            ttk.Label(self, text=label).grid(row=row, column=0, sticky="nw", padx=(0, 12), pady=3)
            state = "readonly" if name == "slug" else "normal"
            ttk.Entry(self, textvariable=self.variables[name], state=state).grid(row=row, column=1, sticky="ew", pady=3)
        if not original:
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
        self.navigation_buttons = []
        if original:
            ttk.Button(actions, text="閉じる", command=root.destroy).pack(side="left", padx=5)
        else:
            self.navigation_buttons = [
                ttk.Button(actions, text="新しい曲", command=self.new_track),
                ttk.Button(actions, text="既存曲を編集…", command=self.choose_existing),
            ]
            for button in self.navigation_buttons:
                button.pack(side="left", padx=5)
            ttk.Button(actions, text="下書き保存", command=self.save_draft).pack(side="left", padx=5)
        self.publish_button = ttk.Button(actions, text="プレビュー・公開…", command=self.preview)
        self.publish_button.pack(side="left")
        self.status = tk.StringVar(value=("既存曲の情報を編集中。MP3の再アップロードは不要だよ。"
                                         if original else "MP3を選択して、曲情報を入力してね。"))
        ttk.Label(self, textvariable=self.status, wraplength=675).grid(
            row=11, column=0, columnspan=3, sticky="w", pady=(10, 0)
        )
        if original:
            self.variables["slug"].set(original.work["id"])
            self.populate(edit_fields(original))
        else:
            self.load_draft()
        self.after(100, self.poll_events)

    def set_busy(self, busy):
        state = "disabled" if busy else "!disabled"
        for button in [self.publish_button, *self.navigation_buttons]:
            button.state([state])

    def choose_existing(self):
        self.start_read("list", lambda: read_snapshot()[3], "GitHubから公開済みの曲一覧を取得中…")

    def start_read(self, event, operation, message):
        self.set_busy(True)
        self.status.set(message)

        def worker():
            try:
                result = operation()
            except Exception as error:
                self.events.put(("error", str(error)))
            else:
                self.events.put((event, result))

        threading.Thread(target=worker, daemon=True).start()

    def show_picker(self, works):
        if not works:
            self.status.set("公開済みの曲が見つからなかったよ。")
            return
        dialog = tk.Toplevel(self)
        dialog.title("編集する曲を選ぶ")
        dialog.transient(self.winfo_toplevel())
        dialog.grab_set()
        picker = ttk.Combobox(dialog, state="readonly", width=68, values=[
            f"{work['title']}  [{work['id']}]" for work in works
        ])
        picker.pack(padx=12, pady=12)
        picker.current(0)

        def open_selected():
            track_id = works[picker.current()]["id"]
            dialog.destroy()
            self.start_read("edit", lambda: load_track_revision(track_id), "曲情報と歌詞を読み込み中…")

        ttk.Button(dialog, text="開く", command=open_selected).pack(pady=(0, 12))
        picker.bind("<Return>", lambda _: open_selected())
        picker.focus_set()

    def open_editor(self, revision):
        window = tk.Toplevel(self)
        window.title(f"Echo Note 曲の編集 - {revision.work['title']}")
        window.minsize(720, 520)
        TrackForm(window, original=revision)
        self.status.set("既存曲の編集画面を開いたよ。")

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
        if isinstance(data, dict):
            self.populate(data)

    def populate(self, data):
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
        try:
            if self.original:
                track = make_track_edit(self.original, self.values())
                if track == self.original:
                    messagebox.showinfo("変更なし", "変更する項目がないよ。", parent=self)
                    return
            else:
                self.ensure_track_id()
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
            f"曲ページ　{public_track_url(track)}",
            *([f"音源　{track.audio.name}", f"転送先　{track.target}"] if not self.original else []),
            *[work[key] for key in ("youtube", "tiktok") if work[key]],
            "",
            work["text"],
            "",
            track.lyrics or "歌詞はまだ公開されていません。",
        ]
        if self.original:
            before = edit_fields(self.original)
            after = edit_fields(track)
            labels = {"title": "曲名", "date": "公開日", "tags": "タグ", "text": "紹介文",
                      "lyrics": "歌詞", "youtube": "YouTube", "tiktok": "TikTok"}
            changed = [label for key, label in labels.items() if before[key] != after[key]]
            lines.insert(0, "変更項目　" + " / ".join(changed))
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
        if not self.original:
            self.save_draft()
        self.set_busy(True)
        self.status.set("公開の準備中…")
        threading.Thread(target=self.publish_track, args=(track,), daemon=False).start()

    def publish_track(self, track):
        report = lambda status: self.events.put(("status", status))
        try:
            commit = publish_edit(self.original, track, report) if self.original else publish(track, report)
        except Exception as error:
            self.events.put(("error", str(error)))
        else:
            action = "更新" if self.original else "登録"
            message = f"GitHubへの{action}が完了したよ。GitHub Pagesの反映後に開けるURL\n{public_track_url(track)}\nコミット {commit[:12]}"
            self.events.put(("success", message))


    def poll_events(self):
        while not self.events.empty():
            kind, message = self.events.get_nowait()
            if kind == "status":
                self.status.set(message)
            else:
                self.set_busy(False)
                if kind == "list":
                    self.status.set("公開済みの曲から選択してね。")
                    self.show_picker(message)
                elif kind == "edit":
                    self.open_editor(message)
                elif kind == "success":
                    self.status.set("GitHubに反映したよ。")
                    messagebox.showinfo("完了", message, parent=self)
                    if self.original:
                        self.winfo_toplevel().destroy()
                        return
                else:
                    self.status.set("処理が途中で止まったよ。")
                    messagebox.showerror("処理の結果", message, parent=self)
        self.after(100, self.poll_events)


if __name__ == "__main__":
    window = tk.Tk()
    window.title("Echo Note 曲の登録")
    window.minsize(720, 565)
    TrackForm(window)
    window.mainloop()
