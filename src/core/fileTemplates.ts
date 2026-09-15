/**
 * Offline stubs that mirror almasix console stub files when smith cannot run.
 */
export interface FileTemplateSpec {
  relativePath: string;
  contents: string;
  openAfterCreate?: boolean;
}

export const FileTemplates = {
  resolve(generatorId: string, name: string): FileTemplateSpec | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    switch (generatorId) {
      case "controller":
        return controller(trimmed);
      case "model":
        return model(trimmed);
      case "view":
        return view(trimmed);
      case "component":
        return component(trimmed);
      case "command":
        return command(trimmed);
      case "middleware":
        return middleware(trimmed);
      case "job":
        return job(trimmed);
      case "seeder":
        return seeder(trimmed);
      case "factory":
        return factory(trimmed);
      case "test":
        return test(trimmed);
      case "migration":
        return migration(trimmed);
      default:
        return null;
    }
  },

  snake(name: string): string {
    const base = name
      .split(/[./]/)
      .pop()!
      .replace(/(Controller|Middleware|Seeder|Factory|Test|Job|Command)$/, "");
    return base
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[./]/g, "_")
      .toLowerCase()
      .replace(/^_+|_+$/g, "");
  },

  className(name: string): string {
    const base = name.split(/[./]/).pop()!;
    if (/[a-z]/.test(base) && /[A-Z]/.test(base)) return base;
    return FileTemplates.snake(base)
      .split("_")
      .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : ""))
      .join("");
  },
};

function lines(...rows: string[]): string {
  return `${rows.join("\n")}\n`;
}

function controller(name: string): FileTemplateSpec {
  let cls = FileTemplates.className(name);
  if (!cls.endsWith("Controller")) cls = `${cls}Controller`;
  return {
    relativePath: `app/http/controllers/${FileTemplates.snake(cls)}.py`,
    contents: lines(
      `"""${cls}."""`,
      "",
      "from __future__ import annotations",
      "",
      "from almasix.http import Controller",
      "",
      "",
      `class ${cls}(Controller):`,
      `    """${cls}."""`,
      "",
      "    async def index(self) -> dict[str, str]:",
      `        return {"controller": "${cls}"}`,
    ),
  };
}

function model(name: string): FileTemplateSpec {
  const cls = FileTemplates.className(name);
  return {
    relativePath: `app/models/${FileTemplates.snake(cls)}.py`,
    contents: lines(
      `"""${cls} model."""`,
      "",
      "from __future__ import annotations",
      "",
      "from almasix.orm import HasFactory, Model",
      "",
      "",
      `class ${cls}(HasFactory, Model):`,
      `    """${cls} model."""`,
      "",
      "    fillable: tuple[str, ...] = ()",
    ),
  };
}

function view(name: string): FileTemplateSpec {
  const dotted = name.replace(/\//g, ".");
  const rel = `${dotted.replace(/\./g, "/")}.prism.html`;
  return {
    relativePath: `resources/views/${rel}`,
    contents: lines(`{{-- ${dotted} --}}`, "<div>", "  {{-- Markup goes here. --}}", "</div>"),
  };
}

function component(name: string): FileTemplateSpec {
  const dotted = name.replace(/^components\./, "").replace(/\//g, ".");
  const rel = `${dotted.replace(/\./g, "/")}.prism.html`;
  return {
    relativePath: `resources/views/components/${rel}`,
    contents: lines(
      "@props({})",
      `{{-- ${dotted} — anonymous Prism component --}}`,
      "<div {{ attributes }}>",
      "  {{ slot }}",
      "</div>",
    ),
  };
}

function command(name: string): FileTemplateSpec {
  let cls = FileTemplates.className(name);
  if (!cls.endsWith("Command")) cls = `${cls}Command`;
  const stem = FileTemplates.snake(cls.replace(/Command$/, ""));
  const signature = stem.replace(/_/g, ":");
  return {
    relativePath: `app/console/commands/${stem}_command.py`,
    contents: lines(
      `"""${cls}."""`,
      "",
      "from __future__ import annotations",
      "",
      "from almasix.console import Command",
      "",
      "",
      `class ${cls}(Command):`,
      `    signature = "${signature}"`,
      `    description = "${cls}"`,
      "",
      "    def handle(self) -> int:",
      `        self.info("${cls} running")`,
      "        return 0",
    ),
  };
}

function middleware(name: string): FileTemplateSpec {
  let cls = FileTemplates.className(name);
  if (!cls.endsWith("Middleware")) cls = `${cls}Middleware`;
  return {
    relativePath: `app/http/middleware/${FileTemplates.snake(cls)}.py`,
    contents: lines(
      `"""${cls}."""`,
      "",
      "from __future__ import annotations",
      "",
      "from collections.abc import Awaitable, Callable",
      "from typing import Any",
      "",
      "from almasix.http import Middleware, Request",
      "",
      "",
      `class ${cls}(Middleware):`,
      `    """${cls}."""`,
      "",
      "    async def handle(",
      "        self,",
      "        request: Request,",
      "        call_next: Callable[[Request], Awaitable[Any]],",
      "    ) -> Any:",
      "        return await call_next(request)",
    ),
  };
}

function job(name: string): FileTemplateSpec {
  const cls = FileTemplates.className(name);
  return {
    relativePath: `app/jobs/${FileTemplates.snake(cls)}.py`,
    contents: lines(
      `"""${cls} job."""`,
      "",
      "from __future__ import annotations",
      "",
      "from almasix.queue import Job, ShouldQueue",
      "",
      "",
      `class ${cls}(ShouldQueue, Job):`,
      `    """Queued job — await ${cls}.dispatch() pushes it to the queue."""`,
      "",
      "    tries = 1",
      "",
      "    async def handle(self) -> None:",
      '        """Run the job."""',
    ),
  };
}

function seeder(name: string): FileTemplateSpec {
  let cls = FileTemplates.className(name);
  if (!cls.endsWith("Seeder")) cls = `${cls}Seeder`;
  return {
    relativePath: `database/seeders/${FileTemplates.snake(cls)}.py`,
    contents: lines(
      `"""${cls}."""`,
      "",
      "from __future__ import annotations",
      "",
      "from almasix.orm import Seeder",
      "",
      "",
      `class ${cls}(Seeder):`,
      `    """${cls}."""`,
      "",
      "    async def run(self) -> None:",
      '        """Seed the application\'s database."""',
    ),
  };
}

function factory(name: string): FileTemplateSpec {
  let cls = FileTemplates.className(name);
  if (!cls.endsWith("Factory")) cls = `${cls}Factory`;
  const modelName = cls.replace(/Factory$/, "");
  const module = `app.models.${FileTemplates.snake(modelName)}`;
  return {
    relativePath: `database/factories/${FileTemplates.snake(cls)}.py`,
    contents: lines(
      `"""${cls}."""`,
      "",
      "from __future__ import annotations",
      "",
      "from typing import Any",
      "",
      "from almasix.orm import Factory",
      "",
      `from ${module} import ${modelName}`,
      "",
      "",
      `class ${cls}(Factory):`,
      `    """Builds ${modelName} rows for seeders and tests."""`,
      "",
      `    model = ${modelName}`,
      "",
      "    def definition(self) -> dict[str, Any]:",
      `        """The attributes a fresh ${modelName} starts from."""`,
      "        return {",
      '            "name": self.fake.name(),',
      "        }",
    ),
  };
}

function test(name: string): FileTemplateSpec {
  let cls = FileTemplates.className(name);
  if (!cls.endsWith("Test")) cls = `${cls}Test`;
  return {
    relativePath: `tests/feature/test_${FileTemplates.snake(cls.replace(/Test$/, ""))}.py`,
    contents: lines(
      `"""${cls} — a feature test: the application, through HTTP."""`,
      "",
      "from __future__ import annotations",
      "",
      "from almasix.testing import TestCase",
      "",
      "",
      `class ${cls}(TestCase):`,
      '    """Exercise a route the way a browser would."""',
      "",
      "    async def test_it_answers(self) -> None:",
      '        response = await self.get("/")',
      "",
      "        response.assert_ok()",
    ),
  };
}

function migration(name: string): FileTemplateSpec {
  const snakeName = FileTemplates.snake(name);
  let table = snakeName.replace(/^create_/, "").replace(/_table$/, "");
  if (!table) table = snakeName;
  const cls = FileTemplates.className(name);
  return {
    relativePath: `database/migrations/0001_01_01_000000_${snakeName}.py`,
    contents: lines(
      `"""Create the ${table} table."""`,
      "",
      "from __future__ import annotations",
      "",
      "from almasix.orm import Blueprint, Migration, Schema",
      "",
      "",
      `class ${cls}(Migration):`,
      `    """${cls}."""`,
      "",
      "    async def up(self) -> None:",
      "        def define(table: Blueprint) -> None:",
      "            table.id()",
      "            table.timestamps()",
      "",
      `        await Schema.create("${table}", define)`,
      "",
      "    async def down(self) -> None:",
      `        await Schema.drop_if_exists("${table}")`,
    ),
  };
}

export const AlmasixFileTemplates = FileTemplates;
