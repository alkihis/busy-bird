export default function (url: string, options: any, timeout = 10000) {
    let controller: AbortController;

    if ("AbortController" in window) {
        controller = new AbortController();
    }
    
    let signal = controller ? controller.signal : undefined;

    return Promise.race([
        fetch(url, Object.assign({ signal }, options)),
        new Promise((_, reject) =>
            setTimeout(() => {
                if (controller)
                    controller.abort();

                reject(new Error('timeout'));
            }, timeout)
        )
    ]) as Promise<Response>;
}
