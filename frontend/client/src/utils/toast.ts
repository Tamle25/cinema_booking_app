import { toast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
    position: "top-right",
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: false,
    icon: false,
    closeButton: false,
};

export const toastSuccess = (message: string, options?: ToastOptions) => {
    const toastId = `success-${message}`;
    if (toast.isActive(toastId)) {
        toast.update(toastId, { render: message, autoClose: 3000 });
        return;
    }
    toast.success(message, {
        ...defaultOptions,
        toastId,
        autoClose: 3000,
        ...options,
    });
};

export const toastError = (message: string, options?: ToastOptions) => {
    const toastId = `error-${message}`;
    if (toast.isActive(toastId)) {
        toast.update(toastId, { render: message, autoClose: 5000 });
        return;
    }
    toast.error(message, {
        ...defaultOptions,
        toastId,
        autoClose: 5000,
        ...options,
    });
};

export const toastWarning = (message: string, options?: ToastOptions) => {
    const toastId = `warning-${message}`;
    if (toast.isActive(toastId)) {
        toast.update(toastId, { render: message, autoClose: 4000 });
        return;
    }
    toast.warn(message, {
        ...defaultOptions,
        toastId,
        autoClose: 4000,
        ...options,
    });
};

export const toastInfo = (message: string, options?: ToastOptions) => {
    const toastId = `info-${message}`;
    if (toast.isActive(toastId)) {
        toast.update(toastId, { render: message, autoClose: 4000 });
        return;
    }
    toast.info(message, {
        ...defaultOptions,
        toastId,
        autoClose: 4000,
        ...options,
    });
};

