import {Classes} from "./deserialize";
const handleObject : Map<any, (obj : any, prop: string, value : any) => any> = new Map([
    //[Array, (_obj : any, _prop: string, value : any) => {return value}],
    [Map, (_obj : any, _prop: string, value : any) => {return Array.from(value)}],
    [Set, (_obj : any, _prop: string, value : any) => {return Array.from(value)}],
    [Object, (_obj : any, _prop: string, value : any) => {return value}]
] as any);

export function serialize(rootObj : any, classes? : Classes) {


    const classMap = new Map();
    if (classes)
        for (let className in classes) {
            classMap.set(classes[className], className);
        }

    let id = 1;
    let lastObj : any;
    const objToId : Map<any, any> = new Map();

    return JSON.stringify(rootObj, replacer, 2)

    function replacer(this: any, prop : string, value : any) : any {
/*
        if (isInternalProperty(prop))
            return undefined;
*/
        if (typeof value === "object" && value !== null && value.__target__)
            value = value.__target__
/*
        if (value === lastObj) {
            lastObj = undefined;
            return lastObj;
        } else
 */
        if (this === lastObj && prop === 'v') {
            lastObj = undefined;
            return value;
        } else if (prop && this[prop] instanceof Date) {
            return {
                c: 'Date',
                v: this[prop].getTime(),
                i: 0
            }
        } else if (typeof value !== 'object' || value === null)
            return value;

        const cachedObj = objToId.get(value);
        if (cachedObj)
            return cachedObj;

        if (value instanceof Array)
            return value;

        let className = value.constructor.name;
        const handler =  handleObject.get(value.constructor);
        if (handler)
            value = handler(this as any, prop, value);
        if (!handler)
            className = classMap.get(value.constructor);
        if (!className)
            throw new Error(`serialize called with class (${value.constructor.name}) not found in class map`)
        const objId = id++;
        objToId.set(value, {c: className, i: objId});
        lastObj = {
            c: className,
            i: objId,
            v: value
        }
        return lastObj;
    }
 }

