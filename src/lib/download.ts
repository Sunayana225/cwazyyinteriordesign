export function downloadText(text: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  let link: HTMLAnchorElement | undefined;
  try {
    link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click();
  } finally {
    try { link?.remove(); }
    finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
}
