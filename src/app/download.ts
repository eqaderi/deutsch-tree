/** Hands a file to the browser to save. It never leaves the device. */
export function download(file: { name: string; text: string }, type: string): void {
  const address = URL.createObjectURL(new Blob([file.text], { type }))
  const link = document.createElement('a')
  link.href = address
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  // Not at once: some browsers start the download a moment after the click.
  window.setTimeout(() => URL.revokeObjectURL(address), 60_000)
}
