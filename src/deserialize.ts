interface ObjectMarker {
    c: string,
    i: number
    v: any
}
type ClassHandlers = {[index: string] : (obj: any)=>any};
export type Classes = {[index: string] : any};

export function deserialize(json : string, classMapIn? : Classes, classHandlers? : ClassHandlers) {
    const classHelpers : {[index: string] : (obj: any)=>any} = {};
    Object.assign(classHelpers, classHandlers || {});

    const classMap = classMapIn || {};

    const objects : Map<number, any> = new Map();
    const obj = JSON.parse(json);
    return processObjectMarker(obj);

    function processObjectMarker(obj : ObjectMarker) {
        if (!obj.c)
            throw new Error("missing c property on ObjectMarker");
        if (!(obj.i || obj.v))
            throw new Error("missing i or v property on ObjectMarker");
        if (obj.v) {
            // Process object based on type (class or primitive)
            switch(obj.c) {
                case 'Object':
                    objects.set(obj.i, obj.v);
                    return processObject(obj.v);
                case 'Map':
                    const map  = new Map(obj.v);
                    objects.set(obj.i, map);
                    // Process subordinate objects for not primitive values
                    map.forEach((value, key) => {
                        if (value instanceof Array)
                            map.set(key, value.map(processObjectProp));
                        else if (typeof value === "object" && value !== null)
                            map.set(key,  processObjectMarker(value as ObjectMarker));
                    })
                    return map;
                case 'Set':
                    let values = obj.v;
                    // Process subordinate objects for not primitive values
                    values.map( (value : any, ix : number) => {
                        if (value instanceof Array)
                            values[ix] = value.map(processObjectProp);
                        else if (typeof value === "object" && value !== null)
                            values[ix] = processObjectMarker(value as ObjectMarker);
                    });
                    const set  = new Set(values);
                    objects.set(obj.i, set);
                    return set;
                case 'Date':
                    const newDate = new Date(obj.v);
                    return newDate;

                // Class in the classes provided or the class helpers
                default:
                    const newClass = classMap[obj.c];

                    // First pref is a class from the classes passed in, 2nd is a helper class
                    const newHelper = classHelpers[obj.c];
                    if (newClass) {
                        const newObj1 = new newClass();
                        Object.assign( newObj1, obj.v);
                        objects.set(obj.i, newObj1);
                        return processObject(newObj1);
                    } else if (newHelper) {
                        const newObj2 = newHelper(obj.v);
                        objects.set(obj.i, newObj2);
                        return processObject(newObj2);
                    } else
                        throw new Error(`Deserialize: Cannot find class ${obj.c}. It must be passed to deserialize`);
            }
        } else {
            // Pull from the cache for recursive object refs
            const newObj2 = objects.get(obj.i);
            if (!newObj2)
                throw new Error(`Deserialize: Cannot find object ${obj.c} ${obj.i}`);
            return newObj2;
        }
    }

    // Process non-primitive subordinate objects distinguishing arrays
    function processObject (obj : any) {
        for (const prop in obj)
            obj[prop] = processObjectProp(obj[prop]);
        return obj;
    }

    // Process a subordinate object property distinguishing arrays
    function processObjectProp (element : any) {
        if (element instanceof Array)
            return processObject(element);
        else if (typeof element === "object" && element !== null)
            return processObjectMarker(element)
        else
            return element;
    }
}
