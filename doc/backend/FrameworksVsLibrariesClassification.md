# WikiStats: Frameworks vs Libraries (and how they stack)

## Rule of thumb

- **Frameworks**: *they call your code* (they control the program flow).
- **Libraries**: *you call them* (you control the flow).

---

## What you use in WikiStats (and what category it is)

### Backend (Kotlin/JVM)

#### Spring Boot / Spring MVC → **Framework**
Spring:
- starts the application
- creates objects (“beans”) and wires dependencies (DI)
- runs the embedded web server
- calls your controller methods when HTTP requests arrive

You don’t write the main loop; Spring does.

#### Retrofit → **Library** (HTTP API layer)
You:
- define an interface (endpoints)
Retrofit:
- generates an implementation for you

But **you still choose when to call it** (e.g., from your service), so it’s a library (even if it *feels* framework-like).

#### OkHttp → **Library** (HTTP client)
Retrofit uses OkHttp underneath to:
- execute HTTP requests
- apply interceptors (logging, headers, etc.)

#### Moshi → **Library** (JSON parsing)
Used by Retrofit (via a converter) to:
- parse JSON → Kotlin objects (DTOs)
- serialize Kotlin objects → JSON (if needed)

#### Gradle → **Build tool** (not runtime)
Gradle:
- resolves dependencies
- builds/compiles
- runs tasks like `bootRun`

---

### Frontend (Browser)

#### Chart.js → **Library**
Your JavaScript calls:
- `new Chart(...)`

It draws charts into a `<canvas>` element.

---

## Quick classification table

| Thing | Category | What it does |
|------|----------|--------------|
| Spring Boot / Spring Web | **Framework** | runs server, DI, routing, calls controllers |
| Retrofit | **Library** | declarative HTTP client from interfaces |
| OkHttp | **Library** | low-level HTTP client + interceptors |
| Moshi | **Library** | JSON serialization/deserialization |
| Chart.js | **Library** | charts in the browser |
| Gradle | **Build tool** | builds & runs the app |

---

## “Who calls whom” (the stack in one sentence)

Spring runs your server; your service calls **Retrofit**; Retrofit uses **OkHttp** to talk to Wikipedia and **Moshi** to parse JSON; the browser UI uses **Chart.js** to plot the returned data.

---

