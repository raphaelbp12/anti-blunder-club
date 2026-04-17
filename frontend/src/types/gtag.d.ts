interface GtagEventParams {
  [key: string]: string | number | boolean | undefined
}

declare function gtag(
  command: 'config',
  targetId: string,
  config?: GtagEventParams,
): void
declare function gtag(
  command: 'event',
  eventName: string,
  eventParams?: GtagEventParams,
): void
declare function gtag(command: 'js', date: Date): void

interface Window {
  gtag: typeof gtag
}
