import { globalClassNames, globalDeserializers } from "./serialize";
type Deserializers = {
    [index: string]: (obj: any, type?: any) => any;
};
export type Classes = {
    [index: string]: any;
};
interface ObjectMarker {
    c: string,
    i: number
    v: any
}
export function deserialize(json : string,
                            classes : Classes = {},
                            deserializersIn : Deserializers = {}, type? : any)
{
    const deserializers = Object.assign(Object.assign({}, globalDeserializers), deserializersIn);
    const classMap = Object.assign(Object.assign({}, globalClassNames), classes);
    const objects = new Map();
    const obj = JSON.parse(json);
    return processObjectMarker(obj);
    function processObjectMarker(obj : ObjectMarker) {
        if (!obj.c)
            throw new Error("missing c property on ObjectMarker");
        if (!(obj.i || obj.v))
            throw new Error("missing i or v property on ObjectMarker");
        if (obj.v) {
            // Process object based on type (class or primitive)
            switch (obj.c) {
                case 'Object':
                    objects.set(obj.i, obj.v);
                    return processObject(obj.v);
                case 'Map':
                    const map = new Map(obj.v);
                    objects.set(obj.i, map);
                    // Process subordinate objects for not primitive values
                    map.forEach((value, key) => {
                        if (value instanceof Array)
                            map.set(key, value.map(processObjectProp));
                        else if (typeof value === "object" && value !== null)
                            map.set(key, processObjectMarker(value  as ObjectMarker));
                    });
                    return map;
                case 'Set':
                    let values = obj.v;
                    // Process subordinate objects for not primitive values
                    values.map((value : any, ix : number) => {
                        if (value instanceof Array)
                            values[ix] = value.map(processObjectProp);
                        else if (typeof value === "object" && value !== null)
                            values[ix] = processObjectMarker(value);
                    });
                    const set = new Set(values);
                    objects.set(obj.i, set);
                    return set;
                case 'Date':
                    const newDate = new Date(obj.v);
                    return newDate;
                // Class in the classes provided or the class helpers
                default:
                    const newClass = classMap[obj.c];
                    // First pref is a class from the helper passed in, 2nd is a helper class
                    const newHelper = deserializers[obj.c];
                    if (newHelper) {
                        const newObj2 = newHelper(obj.v, type);
                        objects.set(obj.i, newObj2);
                        return processObject(newObj2);
                    }
                    else if (newClass) {
                        const newObj1 = new newClass();
                        Object.assign(newObj1, obj.v);
                        objects.set(obj.i, newObj1);
                        return processObject(newObj1);
                    }
                    else
                        throw new Error(`Cannot deserialize  ${obj.c}. Did you call serializable({${obj.c}})?`);
            }
        }
        else {
            // Pull from the cache for recursive object refs
            const newObj2 = objects.get(obj.i);
            if (!newObj2)
                throw new Error(`Deserialize: Cannot find object ${obj.c} ${obj.i}`);
            return newObj2;
        }
    }
    // Process non-primitive subordinate objects distinguishing arrays
    function processObject(obj : any) {
        for (const prop in obj)
            obj[prop] = processObjectProp(obj[prop]);
        return obj;
    }
    // Process a subordinate object property distinguishing arrays
    function processObjectProp(element : any) {
        if (element instanceof Array)
            return processObject(element);
        else if (typeof element === "object" && element !== null)
            return processObjectMarker(element);
        else
            return element;
    }
}
export function deserializer(classHelpers?: Deserializers) {
    for (let className in classHelpers)
        globalDeserializers[className] = classHelpers[className];
}
