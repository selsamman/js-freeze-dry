# js-freeze-dry

Round trip conversion of complex cyclic object graphs to strings with support for classes, maps and sets.

## Installation

```
yarn add js-freeze-dry
```
or
```
npm install js-freeze-dry
```

It has no dependencies and is written in Typescript

## Usage

Consists of two functions, ***serialize*** and ***deserialize*** which convert object graphs to and from strings.

**serialize** converts an object graph to JSON, discovering any objects discovered in the process and noting their constructor in the JSON.   **deserialize** does the opposite and re-instantiates the object graph.  It can cover cases where the same object instance is referenced in multiple places and cyclic patterns. 

### Example

Here is an example structure that includes multiple references to the same object
```typescript
class Box {
    x = 0;
    y = 0;
    constructor(x : number, y : number) {
        this.x = x;
        this.y = y;
    }
}

class Arrow {
    from;
    to;
    constructor(from : Box, to : Box) {
        this.from = from;
        this.to = to;
    }
}

class Drawing {
    boxes : Array<Box> = [];
    arrows : Array<Arrow> = [];
}
```
Assume it is initialized like this:
```typescript
    const drawing = new Drawing()
    const box1 = new Box(20, 40)
    const box2 = new Box(70, 70)
    const arrow1 = new Arrow(box1, box2)
    drawing.boxes.push(box1, box2)
    drawing.arrows.push(arrow1);
```
To serialize it:
```typescript
const json = serialize(drawing, {Box, Arrow, Drawing});
```
And to deserialize it:
```typescript
const newDrawing = deserialize(json, {Box, Arrow, Drawing});
```
Note that to deserialize you need to provide a hash of classNames where the value is the class itself so that serialize can record the class name and deserialize can re-instantiate objects from those class names.

### Restrictions

There are some constraints on the structure:
You can serialize anything that JSON.stringify / JSON.parse support plus:
* Dates
* Sets
* Maps
* Classes - deserialize will instantiate the class with an empty constructor and then copy over the properties.  Therefore, the class **must be creatable with an empty constructor**.

If you want to manually control the creation of objects or have classes that require specific parameters in the constructor you can pass a hash of class names and an associated function to instantiate the object.  It  will be passed the serialized data from the object and is expected to return the instantiated object.  A hash of custom revivers is the third (optional) parameter.

**deserialize** cannot reconstitute objects containing functions unless they are part of classes.  Also objects that contain internal objects (e.g. DOM element references, XMLHTTPRequest, Promises) of course will not be reconstituted properly.

## Reference

### Serialize

```typescript
serialize(rootObj : any) : string
```
Serializes any observable object returning a string that can be deserialized.  While the string can be parsed with JSON.parse it will parse into an internal format that has types and id's and so really is only useful for processing by deserialize.  See the restrictions above on the data that can be processed in this fashion.
### Deserialize
```typescript
type ClassHandlers = {[index: string] : (obj: any)=>any};

deserialize(json : string, classes? : Array<any>, classHandlers? : ClassHandlers)
```
Restores an object from a string returned from **serialize**.  If classes were used in the deserialized data, the classes must be passed in so serialize can create the objects based on them.  
