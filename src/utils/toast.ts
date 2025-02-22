import { toast } from 'vue3-toastify';
import { themeIsDark } from './theme';

export class Toast {
  static success(message: string): Handle {
    return new Handle(toast.success(message, Toast.opts()));
  }

  static error(message: string): Handle {
    return new Handle(toast.error(message, Toast.opts()));
  }

  static warning(message: string): Handle {
    return new Handle(toast.warning(message, Toast.opts()));
  }

  static info(message: string): Handle {
    return new Handle(toast.info(message, Toast.opts()));
  }

  static async promise(
    promise: Promise<any>,
    opts: { pending: string; success: string; error: string },
  ): Promise<Handle> {
    return new Handle(await toast.promise(promise, opts, Toast.opts()));
  }

  static loading(message: string): Handle {
    return new Handle(toast.loading(message, Toast.opts()));
  }

  private static opts() {
    return {
      theme: themeIsDark() ? 'dark' : 'light',
      position: 'bottom-right',
      transition: 'flip',
    } as {
      theme: 'dark' | 'light';
      position: 'bottom-right';
      transition: 'flip';
    };
  }
}

class Handle {
  constructor(private id: string | number) {}

  async msg(message: string) {
    await this.update({ message });
  }

  async success(message: string) {
    await this.update({
      message,
      type: 'success',
      loading: false,
      autoClose: true,
      closeOnClick: true,
    });
  }

  async error(message: string) {
    await this.update({
      message,
      type: 'error',
      loading: false,
      autoClose: true,
      closeOnClick: true,
    });
  }

  async warning(message: string) {
    await this.update({
      message,
      type: 'warning',
      loading: false,
      autoClose: true,
      closeOnClick: true,
    });
  }

  async update(opts: {
    message?: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    loading?: boolean;
    autoClose?: boolean;
    closeOnClick?: boolean;
  }) {
    // Due to a bug in vue3-toastify, we need to wait
    // for the next tick before updating the toast
    await new Promise((resolve) => setTimeout(resolve, 0));

    const toastOpts: any = {
      render: opts.message,
      type: opts.type,
      isLoading: opts.loading,
      autoClose: opts.autoClose,
      closeOnClick: opts.closeOnClick,
    };

    // Remove undefined values
    Object.entries(toastOpts).forEach(
      ([key, value]) => value === undefined && delete toastOpts[key],
    );

    // console.log('update', this.id, tOpts);
    toast.update(this.id, toastOpts);
  }
}
