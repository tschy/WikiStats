# WikiStats

A modern Wikipedia revision statistics visualizer.

## Architecture
- **Backend:** Spring Boot (Kotlin) with Retrofit for Wikipedia API integration.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Chart.js.

## Getting Started

### Prerequisites
- Java 17+
- Node.js 18+

### Development Workflow

To have a fast feedback loop, you should run the backend and frontend separately:

1.  **Start the Backend:**
    ```bash
    ./gradlew bootRun
    ```
    The API will be available at `http://localhost:8080`.

2.  **Start the Frontend:**
    You can run this from the project root:
    ```bash
    npm run dev
    ```
    Alternatively, you can go into the frontend directory:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    Open `http://localhost:5173` in your browser. Vite proxies requests starting with `/api` to the backend.

### Full Build (Production)
To build the entire project into a single executable JAR that serves the frontend:

```bash
./gradlew build
```

This will:
1.  Run `npm ci` and `npm run build` in the `frontend` directory.
2.  Copy the built assets from `frontend/dist` to the Spring Boot static resources.
3.  Package everything into `build/libs/WikiStats-1.0-SNAPSHOT.jar`.

You can then run the app with:
```bash
java -jar build/libs/WikiStats-1.0-SNAPSHOT.jar
```
And access it at `http://localhost:8080`.

## Project Structure
- `src/main/kotlin/wikistats/`: Backend source code.
- `frontend/`: React application.
  - `src/components/`: UI components (Chart, Form, Preview, etc.).
  - `src/hooks/`: Custom React hooks for data fetching.
  - `src/lib/`: Shared types and utilities.
