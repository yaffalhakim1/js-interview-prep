> This file is generated from `html/03-prototypes.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 1 · Language basics -->

# Prototypes and classes

Objects in JavaScript can point to another object. That link is called the prototype. When you read a property that is missing, JavaScript looks at the linked object. `class` is a shorter way to write the same thing.

## 1. How lookup works

Every object has a hidden link to another object, or to `null`. Reading a property follows that link until the property is found.

**lookup.js**

```js
const animal = {
  breathes: true,
  speak() { return `${this.name} makes a sound`; }
};

const dog = Object.create(animal);   // dog's prototype is animal
dog.name = "Rex";

console.log("dog's own keys:", Object.keys(dog));   // only "name"
console.log("inherited:", dog.breathes);            // found on animal
console.log("method call:", dog.speak());           // `this` is dog

console.log("end of chain:", Object.getPrototypeOf(animal) === Object.prototype);
```

Look at `dog.speak()`. The function is found on `animal`, but `this` is `dog`. Finding the method and setting `this` are two separate things. This confuses many people, so say it clearly.

### Why put methods on the prototype?

To save memory. A method on the prototype exists once. A method assigned inside the constructor exists once per object. With 10,000 rows in a table, that is 10,000 functions instead of one.

## 2. What new does

Four steps, in this order:

1. Make a new empty object.
2. Link it to `Fn.prototype`.
3. Call `Fn` with that object as `this`.
4. If the function returns an object, use that. Otherwise use the new object.

**myNew.js**

```js
function myNew(Fn, ...args) {
  if (typeof Fn !== "function") throw new TypeError("not a constructor");

  const obj = Object.create(Fn.prototype);        // steps 1 and 2
  const result = Fn.apply(obj, args);             // step 3

  return result !== null && typeof result === "object" ? result : obj;   // step 4
}

function User(name) { this.name = name; }
User.prototype.greet = function () { return `hi ${this.name}`; };

const u = myNew(User, "lin");
console.log(u.greet());
console.log("is a User:", u instanceof User);
```

**Why this matters**

**Step 4 is the one people forget**

If a constructor returns an object, that object wins and the new `this` is thrown away. Returning a number or string is ignored.

## 3. What class really is

`class` is a shorter way to write the same code. Methods go on `prototype`. Static methods go on the class itself.

**same code, two ways**

```js
// Old style
function Point(x, y) { this.x = x; this.y = y; }
Point.prototype.dist = function () {
  return Math.hypot(this.x, this.y).toFixed(2);
};

// New style
class Point2 {
  constructor(x, y) { this.x = x; this.y = y; }
  dist() { return Math.hypot(this.x, this.y).toFixed(2); }
  static origin() { return new Point2(0, 0); }
}

console.log(new Point(3, 4).dist(), new Point2(3, 4).dist());
console.log("methods live on prototype:", Object.getOwnPropertyNames(Point2.prototype));
console.log("static lives on the class:", typeof Point2.origin);
```

Differences that matter in an interview:

| Behaviour | Function constructor | class |
| --- | --- | --- |
| Call without `new` | Runs, usually wrongly | Throws `TypeError` |
| Hoisting | Ready immediately | Hoisted but unusable until the line runs |
| Prototype methods | Show up in `for...in` | Hidden from `for...in` |
| Strict mode | Only if you ask | Always on |
| Inheritance | You wire it up yourself | `extends` and `super` |

**Watch out**

**"Classes are not hoisted" is wrong**

They are hoisted. But the name cannot be used until the class line runs. You get `ReferenceError: Cannot access 'X' before initialization`. That is a different error from `X is not defined`.

## 4. Inheritance with extends

**extends.js**

```js
class Shape {
  constructor(name) { this.name = name; }
  describe() { return `a ${this.name}`; }
}

class Circle extends Shape {
  constructor(r) {
    super("circle");     // must run before you touch `this`
    this.r = r;
  }
  area() { return (Math.PI * this.r ** 2).toFixed(2); }
  describe() { return `${super.describe()} of radius ${this.r}`; }
}

const c = new Circle(2);
console.log(c.describe());
console.log("area:", c.area());
console.log("is a Circle:", c instanceof Circle, "· is a Shape:", c instanceof Shape);
console.log("chain is linked:", Object.getPrototypeOf(Circle.prototype) === Shape.prototype);
```

Two things to remember. `super()` must run before you use `this`, because the object does not exist until the parent constructor runs. And `instanceof` walks the chain, so a `Circle` is also a `Shape`.

## 5. Write instanceof yourself

**myInstanceOf.js**

```js
function myInstanceOf(obj, Ctor) {
  if (obj === null || (typeof obj !== "object" && typeof obj !== "function")) {
    return false;
  }

  const target = Ctor.prototype;
  let proto = Object.getPrototypeOf(obj);

  while (proto !== null) {
    if (proto === target) return true;
    proto = Object.getPrototypeOf(proto);   // walk up the chain
  }
  return false;
}

class A {}
class B extends A {}
const b = new B();

console.log(myInstanceOf(b, B), myInstanceOf(b, A), myInstanceOf(b, Object));
console.log("an object is not an Array:", myInstanceOf({}, Array));
```

## 6. Common mistakes

- **Replacing `prototype` after you made objects.** Old objects still point at the old prototype.
- **Using an arrow function as a method.** Arrows have no `this`, so `Dog.prototype.bark = () => this.name` never works.
- **Forgetting `constructor`.** If you replace the prototype, set `constructor` back.
- **Mixing up `__proto__` and `prototype`.** `__proto__` is the link on an object. `prototype` is a property on a function that sets that link.
- **Using `Object.create(null)` by accident.** You get an object with no methods at all, not even `hasOwnProperty`.

**Say this in an interview**

"Reading a property walks up the prototype chain. Writing always sets the value on the object itself. `new` makes an object, links it to `Fn.prototype`, calls the function with that object as `this`, and uses any returned object. `class` does the same thing with stricter rules."

## 7. Check yourself

**Check:** Why does dog.speak() say "Rex" when speak lives on animal?

The method is found on `animal`, but `this` comes from the call site. `dog.speak()` sets `this` to `dog`. Finding the code and setting the receiver are separate steps.

**Check:** What happens if you call a class without new?

`TypeError: Class constructor A cannot be invoked without 'new'`. An old function constructor would have run instead.

**Check:** When would you use Object.create(null)?

For a lookup table keyed by user input. A normal object already has keys like `toString`, so `obj["toString"]` gives a wrong answer. A null-prototype object has no inherited keys. Today a `Map` is usually a better choice.

---

← [The this keyword](02-this.md) · [Contents](index.md) · [Types and conversion](04-types.md) →
