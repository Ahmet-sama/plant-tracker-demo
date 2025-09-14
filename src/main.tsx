import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./styles.css"

const rootEl = document.getElementById("root")
if (!rootEl) {
throw new Error("Kök element (#root) bulunamadı")
}

const root = ReactDOM.createRoot(rootEl)
root.render(
<React.StrictMode>
<App />
</React.StrictMode>
)