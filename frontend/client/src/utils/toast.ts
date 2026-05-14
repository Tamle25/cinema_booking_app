import { toast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: false,
    icon: false,
    closeButton: false,
};

export const toastSuccess = (message: string, options?: ToastOptions) => {
    toast(message, {
        ...defaultOptions,
        className: 'toast-minimal toast-success',
        ...options,
    });
};

export const toastError = (message: string, options?: ToastOptions) => {
    toast(message, {
        ...defaultOptions,
        className: 'toast-minimal toast-error',
        autoClose: 4000,
        ...options,
    });
};

export const toastWarning = (message: string, options?: ToastOptions) => {
    toast(message, {
        ...defaultOptions,
        className: 'toast-minimal toast-warning',
        ...options,
    });
};

export const toastInfo = (message: string, options?: ToastOptions) => {
    toast(message, {
        ...defaultOptions,
        className: 'toast-minimal toast-info',
        ...options,
    });
};
