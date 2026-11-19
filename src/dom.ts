export function requireElement<T extends Element>(
  selector: string,
  type: { new(): T },
  root: ParentNode = document,
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`必要な画面要素が見つかりません: ${selector}`);
  return element;
}
