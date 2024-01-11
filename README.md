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
    name = "";
    constructor(x : number, y : number) {
        this.x = x;
        this.y = y;
    }
}
serializable({Box});


class Arrow {
    from;
    to;
    constructor(from : Box, to : Box, name: string) {
        this.from = from;
        this.to = to;
        this.name = name;
    }
}
serializable({Arrow})

class Drawing {
    boxes : Array<Box> = [];
    arrows : Array<Arrow> = [];
}
serializable({Drawing});
```
Assume it is initialized like this:
```typescript
    const drawing = new Drawing()
    const box1 = new Box(20, 40, "One");
    const box2 = new Box(70, 70, "Two");
    const arrow1 = new Arrow(box1, box2)
    drawing.boxes.push(box1, box2)
    drawing.arrows.push(arrow1);
```
To serialize it:
```typescript
const json = serialize(drawing);
```
And to deserialize it:
```typescript
const newDrawing = deserialize(json);
```
Note that to deserialize you need to call serializable to provide a hash of className with a value of the class itself.  Note that ``serializable({Drawing})`` is short for ``serializable({'Drawing' : Drawing})``).  This is so that deserialize can find the name of the class reliably even if class names are mangled by code compression.

js-freeze-dry is designed for data oriented classes though through the use of helpers it may be used with members that are not natively serializable.

### Restrictions

There are some constraints on the structure:
You can serialize anything that JSON.stringify / JSON.parse support plus:
* Dates
* Sets
* Maps
* Classes - deserialize will instantiate the class with an empty constructor and then copy over the properties.  Therefore, the class **must be instantiable with an empty constructor**.


**deserialize** cannot reconstitute objects containing functions unless they are part of classes.  Also objects that contain internal objects (e.g. DOM element references, XMLHTTPRequest, Promises) of course will not be reconstituted properly.

### Helpers ###
Sometimes you want to control the process of serialization or deserialization on a class by class basis.  Examples include:
* Encrypting data
* Removing sensitive data
* Classes that have unserializable content
* Classes that expect parameters in their constructors.

To create a "serializer":
```
serializer({Box: (box : Box) => ({...box, name: encrypt(box.name)}) });
```
The serializer function is passed the data and it may return a copy of the data.  Generally you would not want to mutuate the data itself as it would impact the instance being serialized.

To create a "deserializer":
```
deserializer({Box: (box : Box) => new Box(box.x, box.y, decrypt(box.name)) });
```
The deserializer will be passed the data and is to return a new instance of the class.  Note that i can use ``Object.assign`` to transfer the properties if needed as this is what the default deserialization does.

## Reference

### Serialize

```typescript
function serialize(rootObj : any, 
                   classes? : {[index: string] : any}, 
                   serializers? : {[index: string] : (obj: any, type? : any) => any}, type? : any) 
```
Serializes an object returning a string that can be deserialized.

* **classes** is an optional parameter to define the same values as would be passed to serializable
* **serializers** is an optional parameter to define the same values as would be passed to serializer
* **type** is an optional type that is passed as the 2nd argument to the serializer.


It returns a JSON string.  While the string can be parsed with JSON.parse it will parse into an internal format that has types and id's and so really is only useful for processing by deserialize.  See the restrictions above on the data that can be processed in this fashion.
### Deserialize
```typescript
deserialize(json : string, 
            classes? : {[index: string] : any},
            deserializers? : {[index: string] : (obj: any, type? : any) => any})
```
* **classes** is an optional parameter to define the same values as would be passed to serializable
* **deserializers** is an optional parameter to define the same values as would be passed to deserializer
* **type** is an optional type that is passed as the 2nd argument to the deserializer.


Returns an instance of an object.

### Serializer ###

```
function serializer (classHelpers? : {[index: string] : (obj: any)=>any}) 
```
Establishes one or more serializer functions identified by a key that represents the name of the class.  The function will be passed an object to be serialized and optionally a type passed to serialize.  The function is expected to return the data to be serialized.  It should not mutate the data but rather make a copy if the data must be changed prior to serialization.  For example:
```
serializer({Box: (box : Box) => ({...box, name: encrypt(box.name)}) });
```

### Deserializer ###

```
function deserializer(classHelpers?: {[index: string] : (obj: any, type? : any) => any})
```
Establishes one or more deserializer functions identified by a key that represents the name of the class.  The function will be passed the data of an object to be deserialized and optionally a type passed to serialize.  The function is expected to return an instance of the object.  For example:
```
deserializer({Box: (box : Box) => new Box(box.x, box.y, decrypt(box.name)) });
```
