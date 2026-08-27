/**
 * Thin wrapper around the Notification API. Every call is a no-op when the
 * browser has no support, or when the user has denied permission — callers can
 * fire these blind without guarding.
 */

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Ask for permission if we've never asked. Safe to call repeatedly: the browser
 * only shows the prompt while permission is still 'default'.
 */
export async function ensureNotifyPermission(): Promise<NotificationPermission> {
  if (!supported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export interface NotifyOptions {
  body?: string;
  /** Shown as the large preview image where the platform supports it. */
  image?: string;
  /** Small icon in the corner of the notification. */
  icon?: string;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag?: string;
  /** Called when the user clicks the notification body. */
  onClick?: () => void;
}

export function notify(title: string, options: NotifyOptions = {}): void {
  if (!supported() || Notification.permission !== 'granted') return;

  try {
    const { onClick, ...rest } = options;
    const notification = new Notification(title, {
      ...rest,
      // `image` is non-standard but widely supported; TS's lib doesn't know it.
    } as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };
  } catch {
    // Some browsers throw for constructor-based notifications (mobile Chrome
    // requires a service worker). Nothing actionable — the in-app toast covers it.
  }
}
