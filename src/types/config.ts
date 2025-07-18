// Config Type Definition
export type Config = {
    headless: boolean;
    viewport: {
        width: number;
        height: number;
    };
    timeout: number;
    retries: number;
    userAgent: string;
    launchOptions: {
        args: string[];
    };
};
