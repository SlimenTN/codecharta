export interface nodeAttributes {
    [key : string] : number;
}

export interface node {
    readonly name : string;
    readonly width : number;
    readonly height : number;
    readonly length : number;
    readonly depth : number;
    readonly x0 : number;
    readonly z0 : number;
    readonly y0 : number;
    readonly isLeaf : boolean;
    readonly deltas : any;
    readonly attributes : nodeAttributes;
    readonly children : node[];
    readonly isDelta : boolean;
}