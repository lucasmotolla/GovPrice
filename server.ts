import express from "express";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper function to execute Python scripts cleanly
function runPython(action: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), "python", "main.py");
    const py = spawn("python3", [pythonScript, "--action", action], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => {
      stdout += data.toString("utf-8");
    });

    py.stderr.on("data", (data) => {
      stderr += data.toString("utf-8");
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}: ${stderr || stdout}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Python JSON output: ${stdout}`));
      }
    });

    py.on("error", (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });

    if (payload) {
      py.stdin.write(JSON.stringify(payload));
    }
    py.stdin.end();
  });
}

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2. Python Status and Info
app.get("/api/python/status", async (_req, res) => {
  try {
    const info = await runPython("info", null);
    res.json({ status: "ok", ...info });
  } catch (error: any) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

// 3. Statistical Calculation using Python Engine
app.post("/api/python/calculate", async (req, res) => {
  try {
    const { items } = req.body;
    const result = await runPython("calculate", { items: items || [] });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Official Laudo generation via Python
app.post("/api/python/laudo", async (req, res) => {
  try {
    const { items, product } = req.body;
    const result = await runPython("laudo", { items: items || [], product: product || "Item de Consumo" });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Safe Domain / Internet Site Validation via Python
app.post("/api/python/validate-source", async (req, res) => {
  try {
    const { url } = req.body;
    const result = await runPython("validate_source", { url: url || "" });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Safe Search Query Generation via Python
app.post("/api/python/search-queries", async (req, res) => {
  try {
    const { product, brand } = req.body;
    const result = await runPython("search_queries", { product: product || "", brand });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Download or view the Standalone Python script
app.get("/api/python/script-source", (_req, res) => {
  try {
    const scriptPath = path.join(process.cwd(), "python", "govprice_pesquisa_precos.py");
    const content = fs.readFileSync(scriptPath, "utf-8");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(content);
  } catch (error: any) {
    res.status(500).send(`Erro ao carregar script Python: ${error.message}`);
  }
});

// 8. Export Full Project Code as ZIP
app.get("/api/export/zip", (_req, res) => {
  const tmpZipPath = path.join(process.cwd(), ".tmp_project_export.zip");
  const py = spawn("python3", [path.join(process.cwd(), "python", "export_project.py"), tmpZipPath]);

  py.on("close", (code) => {
    if (code !== 0 || !fs.existsSync(tmpZipPath)) {
      return res.status(500).json({ error: "Falha ao gerar o arquivo ZIP do projeto." });
    }
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="govprice_projeto_completo.zip"');
    
    const fileStream = fs.createReadStream(tmpZipPath);
    fileStream.pipe(res);
    fileStream.on("end", () => {
      try {
        fs.unlinkSync(tmpZipPath);
      } catch {}
    });
  });

  py.on("error", (err) => {
    res.status(500).json({ error: `Erro no processo de exportação: ${err.message}` });
  });
});

// 9. Export Full Code for Gemini (Markdown / Text Single File)
app.get("/api/export/gemini", (_req, res) => {
  const filePath = path.join(process.cwd(), "public", "govprice_full_code_for_gemini.md");
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Arquivo não encontrado. Execute o gerador.");
  }
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="govprice_full_code_for_gemini.md"');
  res.sendFile(filePath);
});

async function startServer() {
  // Vite middleware in dev; static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express 5 requires *all
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GovPrice Full-Stack server with Python Engine running on port ${PORT}`);
  });
}

startServer();
