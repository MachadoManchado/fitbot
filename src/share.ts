/** Entrega um arquivo ao usuário: no celular abre "Compartilhar" (salvar no Drive, WhatsApp...), senão baixa. */
export async function deliverFile(text: string, filename: string, type: string): Promise<string> {
  const file = new File([text], filename, { type })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'Arquivo pronto para salvar ou enviar.'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return ''
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'Arquivo baixado.'
}
