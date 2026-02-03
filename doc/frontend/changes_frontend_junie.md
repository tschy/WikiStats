To see the changes I've implemented, you can explore the new directory structure and run the application in a few different ways.

### 1. Where to see the changes in the Code

I have moved the frontend logic from the single `index.html` file into a modern, organized React structure located in the `frontend/` directory at the root of the project.

**Key Files & Directories:**
*   **`frontend/src/App.tsx`**: The main application shell that coordinates the state and layout.
*   **`frontend/src/components/`**: Contains the modular UI pieces:
    *   `SearchForm.tsx`: Handles the Wikipedia title, date range, and limit inputs.
    *   `RevisionChart.tsx`: A React wrapper for Chart.js, including zoom and pan functionality.
    *   `ArticlePreview.tsx`: Displays the Wikipedia summary (thumbnail, extract, etc.).
    *   `StatusBar.tsx`: Shows loading, success, and error messages.
*   **`frontend/src/hooks/useWikipediaData.ts`**: A custom React hook that encapsulates all the fetching logic for the `/api/preview` and `/api/revisions` endpoints.
*   **`build.gradle.kts`**: I updated this to automate the frontend build process. It now includes tasks like `frontendBuild` and `copyFrontendDist`.
*   **`README.md`**: I've initialized this file with setup and run instructions.

---

### 2. How to see the changes in the Web Browser

You can view the changes either in a **Development** environment (recommended for fast changes) or as a **Full Build**.

#### A. Development Mode (Vite + Spring Boot)
This is the best way to see the app while you are coding. It allows for "Hot Module Replacement," meaning the browser updates instantly when you save a file.

1.  **Start the Backend:**
    Open a terminal and run:
    ```bash
    ./gradlew bootRun
    ```
    The API will be running at `http://localhost:8080`.

2.  **Start the Frontend:**
    Open a second terminal and run:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    Now, open **`http://localhost:5173`** in your browser.
    *   *Note: Vite is configured to proxy any requests starting with `/api` to your Spring Boot server on port 8080.*

#### B. Full Build Mode
If you want to see how the application looks when it's fully packaged:

1.  **Run the Gradle build:**
    ```bash
    ./gradlew build
    ```
    This command will automatically trigger the `npm build`, copy the resulting files into the Spring Boot resources, and package everything.

2.  **Run the JAR:**
    ```bash
    java -jar build/libs/WikiStats-1.0-SNAPSHOT.jar
    ```
3.  **View it:**
    Open **`http://localhost:8080`**. Spring Boot is now serving the compiled React app directly.

---

### Summary of what’s improved in the UI:
*   **Responsive Design:** Uses Tailwind CSS for a layout that works better on different screen sizes.
*   **State Management:** Proper loading and error states for each part of the UI.
*   **Interactivity:** Better integration of Chart.js features like zooming and panning.
*   **Type Safety:** The entire frontend is written in TypeScript, ensuring the data coming from your Kotlin backend matches what the UI expects.