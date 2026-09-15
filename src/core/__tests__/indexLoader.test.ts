import { describe, expect, it } from "vitest";
import { IndexLoader } from "../indexLoader";
import { SymbolKind } from "../types";

describe("IndexLoader", () => {
  it("parses minimal JSON fixture", () => {
    const json = `
      {
        "base_path": "/tmp/app",
        "ok": true,
        "error": null,
        "views": {"welcome": "/tmp/app/resources/views/welcome.prism.html"},
        "routes": {
          "home": {"name": "home", "uri": "/", "methods": ["GET"], "path": "/tmp/app/routes/web.py", "line": 12}
        },
        "config_keys": ["app.name", "app.env"],
        "config_files": {"app": "/tmp/app/config/app.py"},
        "config_locations": {
          "app.env": {"path": "/tmp/app/config/app.py", "line": 17}
        },
        "translation_keys": ["messages.hello"],
        "middleware_aliases": ["web", "auth"],
        "env_keys": {
          "APP_KEY": {
            "path": "/tmp/app/.env",
            "line": 3,
            "kind": "env",
            "detail": "Set in .env",
            "used_by": ["config/app.py:22"]
          }
        },
        "env_options": {
          "QUEUE_CONNECTION": ["database", "redis", "sync"]
        },
        "tables": {
          "users": {
            "path": "/tmp/app/database/migrations/0001_users.py",
            "line": 5,
            "columns": {
              "id": {"path": "/tmp/app/database/migrations/0001_users.py", "line": 6},
              "email": {"path": "/tmp/app/database/migrations/0001_users.py", "line": 7}
            },
            "detail": "users"
          }
        },
        "model_metadata": {
          "User": {
            "module": "user",
            "path": "/tmp/app/app/models/user.py",
            "fillable": ["email"],
            "casts": {"id": "int"},
            "relations": ["posts"],
            "relation_lines": {"posts": 42}
          }
        },
        "relations": {"User": ["posts"]},
        "casts": ["int", "datetime"],
        "components": {"alert": "/tmp/x"},
        "gates": ["update"],
        "disks": ["local"],
        "queues": ["sync"],
        "caches": ["file"],
        "mailers": ["smtp"],
        "inertia_pages": ["Dashboard"],
        "smith_commands": ["serve", "ide:index"],
        "validation_rules": ["required", "email"],
        "directives": ["if", "endif"],
        "view_helpers": [{"name": "auth", "path": "/tmp/helpers.py", "line": 9, "kind": "helper"}],
        "view_shared": {
          "csrf_token": {"path": "/tmp/auth.py", "line": 5, "kind": "shared"}
        },
        "view_data": {
          "welcome": {
            "title": {
              "kind": "data",
              "path": "/tmp/app/app/http/controllers/welcome_controller.py",
              "line": 22
            }
          }
        },
        "vite_entries": {"resources/js/app.js": "/tmp/app.js"},
        "controller_actions": {"WelcomeController": ["index"]}
      }
    `;
    const index = IndexLoader.parse(json);
    expect(index.ok).toBe(true);
    expect(index.views).toHaveProperty("welcome");
    expect(index.routes.home!.uri).toBe("/");
    expect(index.routes.home!.path).toBe("/tmp/app/routes/web.py");
    expect(index.routes.home!.line).toBe(12);
    expect(index.configKeys.has("app.name")).toBe(true);
    expect(index.configFiles.app).toBe("/tmp/app/config/app.py");
    expect(index.configLocations["app.env"]!.line).toBe(17);
    expect(index.tables.users!.columns).toHaveProperty("email");
    expect(index.relations.User).toEqual(["posts"]);
    expect(index.modelMetadata.User!.relationLines!.posts).toBe(42);
    expect(index.validationRules.has("required")).toBe(true);
    expect(index.known(SymbolKind.ROUTE, "home")).toBe(true);
    expect(index.known(SymbolKind.ROUTE, "missing")).toBe(false);
    expect(index.viewNameForPath("/tmp/app/resources/views/welcome.prism.html")).toBe(
      "welcome",
    );
    expect(index.optionsForEnvKey("QUEUE_CONNECTION")).toEqual([
      "database",
      "redis",
      "sync",
    ]);
  });
});
