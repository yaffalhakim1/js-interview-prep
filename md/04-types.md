> This file is generated from `html/04-types.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 1 · Language basics -->

# Types and conversion

JavaScript has seven simple types and one object type. But `typeof` gives a wrong answer for two of them. And `==` converts values before comparing. Both cause confident wrong answers in interviews, so this page gives you the exact rules.

## 1. The types

Seven simple types: `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`. Everything else is an object. That includes arrays, functions, dates and maps.

| Value | `typeof` gives | Best way to check |
| --- | --- | --- |
| `"hi"` | `"string"` | `typeof` |
| `42` | `"number"` | `typeof` |
| `NaN` | `"number"` | `Number.isNaN(x)` |
| `true` | `"boolean"` | `typeof` |
| `undefined` | `"undefined"` | `x === undefined` |
| `null` | `"object"` (a bug) | `x === null` |
| `Symbol()` | `"symbol"` | `typeof` |
| `10n` | `"bigint"` | `typeof` |
| `[]` | `"object"` | `Array.isArray(x)` |
| `{}` | `"object"` | `Object.prototype.toString.call(x)` |
| `function(){}` | `"function"` | `typeof` |
| `new Date()` | `"object"` | `x instanceof Date` |

`typeof null === "object"` is a bug from 1995. It was kept because too much old code depends on it. Say that and you show you know it is not a design choice.

### A check that works for almost everything

**tag.js**

```js
function tag(v) {
  return Object.prototype.toString.call(v).slice(8, -1);
}

console.log(tag([]), tag({}), tag(null), tag(undefined));
console.log(tag(new Map()), tag(new Set()), tag(/x/), tag(new Date()));
console.log(tag(Promise.resolve()), tag(function () {}));
```

**Watch out**

**Checking for an array**

`typeof []` is `"object"`. And `[] instanceof Array` fails across iframes. That is exactly why `Array.isArray` exists.

## 2. Simple values act like objects

`"abc".length` works even though a string is not an object. JavaScript wraps it in a `String` object for a moment, reads the property, then throws the wrapper away.

**boxing.js**

```js
// Reading works: the engine wraps the string for a moment
const s = "abc";
console.log("length:", s.length);
console.log("method:", s.toUpperCase());

// Writing fails in strict mode, because the wrapper is thrown away
try {
  s.custom = 1;
} catch (e) {
  console.log("cannot add a property:", e.name);
}
console.log("still undefined:", s.custom);

// A real String object keeps properties
const o = new String("abc");
o.custom = 1;
console.log("object keeps it:", o.custom);
console.log("types differ:", typeof s, "vs", typeof o);
console.log("loose equal:", s == o, "· strict equal:", s === o);
```

This is also why `new Boolean(false)` is a trap. It is an object, and every object counts as true. So `if (new Boolean(false))` runs the branch.

## 3. == vs ===

`===` checks the type first. Different types means `false` straight away. `==` converts the values to the same type first. The rules are fixed, not random.

| Comparison | What happens | Result |
| --- | --- | --- |
| `null == undefined` | special case: equal to each other only | `true` |
| `null == 0` | `null` is never converted | `false` |
| `1 == "1"` | string becomes a number | `true` |
| `"" == 0` | empty string becomes 0 | `true` |
| `[] == false` | `[]` becomes `""`, then `0` | `true` |
| `[1] == 1` | `[1]` becomes `"1"`, then `1` | `true` |
| `NaN == NaN` | NaN never equals anything | `false` |
| `{} == {}` | two different objects | `false` |

**try it**

```js
const pairs = [
  [null, undefined], [null, 0], [0, ""], ["0", false],
  [[], false], [[1], 1]
];

for (const [a, b] of pairs) {
  console.log(
    JSON.stringify(a) + " == " + JSON.stringify(b) +
    " → " + (a == b) + "   (strict: " + (a === b) + ")"
  );
}
```

**Tip**

**The one exception people allow**

`x == null` is a common way to say "null or undefined". That is accepted. For everything else, use `===`. If the types differ, fix the types instead of comparing them.

## 4. Which values count as false

There are exactly eight. Everything else counts as true.

**falsy.js**

```js
const falsy = [false, 0, -0, 0n, "", null, undefined, NaN];
console.log("all count as false:", falsy.every((v) => !v));
console.log("how many:", falsy.length);

// The surprises
console.log("[] is true:", Boolean([]));
console.log("{} is true:", Boolean({}));
console.log('"0" is true:', Boolean("0"));
console.log('" " is true:', Boolean(" "));
console.log("new Boolean(false) is true:", Boolean(new Boolean(false)));
```

A common bug: `if (value)` where `0` and `""` are valid input. Use `value !== undefined && value !== null` when 0 and empty string are allowed.

## 5. Operators that convert values

### + prefers strings

**plus.js**

```js
console.log(1 + 2);        // 3
console.log(1 + "2");      // "12", the string wins
console.log("1" + 2 + 3);  // "123", works left to right
console.log(1 + 2 + "3");  // "33"
console.log([] + {});      // "[object Object]"
console.log([1] + [2]);    // "12"
```

### The others prefer numbers

`-`, `*`, `/` and `%` turn both sides into numbers. So `"6" / "2"` is `3`. That is why `+` is the dangerous one.

### NaN spreads through maths

**nan.js**

```js
console.log(Number("abc"));          // NaN
console.log(parseInt("12px"));       // 12, stops at the first non-digit
console.log(Number("12px"));         // NaN, strict

console.log("NaN equals itself?", NaN === NaN);      // false
console.log("Object.is fixes it:", Object.is(NaN, NaN));  // true
console.log("Object.is sees -0:", Object.is(0, -0));      // false
console.log("includes finds NaN:", [NaN].includes(NaN));  // true
```

## 6. Number problems worth knowing

- `0.1 + 0.2 !== 0.3`. This is normal for decimal numbers in binary. Compare with a small tolerance instead.
- `Number.MAX_SAFE_INTEGER` is about 9 quadrillion. Bigger integers lose precision. Use `BigInt` for money or long IDs.
- Always pass a base: `parseInt(x, 10)`.
- `Number("")` is `0`, not `NaN`. That is a validation trap.
- `1 / 0` is `Infinity`. `Infinity - Infinity` is `NaN`.

## 7. Check yourself

**Check:** Why is [] == false true?

`false` becomes `0`. The array becomes `""` through `toString()`, and `""` becomes `0`. So it is `0 == 0`.

**Check:** Write a function that checks for a plain object.

```js
function isPlainObject(v) {
  if (v === null || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}
```

Checking the prototype is better than checking the tag. It rejects arrays, maps, and class instances on purpose.

**Check:** When should you use Object.is instead of ===?

Two cases only: to detect `NaN`, and to tell `+0` from `-0`. Otherwise it behaves the same.

---

← [Prototypes and classes](03-prototypes.md) · [Contents](index.md) · [Promises and async/await](05-promises.md) →
