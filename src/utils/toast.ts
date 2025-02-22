import { toast } from 'vue3-toastify';
import { themeIsDark } from './theme';

export class Toast {
  static success(message: string) {
    toast.success(message, Toast.opts());
  }

  static error(message: string) {
    toast.error(message, Toast.opts());
  }

  static warning(message: string) {
    toast.warning(message, Toast.opts());
  }

  static info(message: string) {
    toast.info(message, Toast.opts());
  }

  private static opts() {
    return {
      theme: this.theme,
      position: 'bottom-right',
    } as {
      theme: 'dark' | 'light';
      position: 'bottom-right';
    };
  }

  private static get theme() {
    return themeIsDark() ? 'dark' : 'light';
  }
}
