export type IWorkspace = {
    label: string;
    name: string;
    owner: boolean;
};

export type IChatMessage = {
    uuid: number;
    user: string;
    ts: number;
    message: string;
};