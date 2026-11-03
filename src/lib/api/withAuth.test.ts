import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createWithAuth } from "./withAuth";
import { NextRequest, NextResponse } from "next/server";

describe("withAuth Higher-Order Handler — API Authentication & Error Handling", () => {
  it("Deve retornar 401 caso não haja sessão válida ou o resolver falhe", async () => {
    const unauthenticatedAuth = createWithAuth(async () => null);

    const handler = unauthenticatedAuth(async (req, ctx, { user }) => {
      return NextResponse.json({ message: `Olá ${user.name}` });
    });

    const fakeReq = new NextRequest("http://localhost:3000/api/test");
    const response = await handler(fakeReq, {});
    assert.strictEqual(response.status, 401);

    const body = await response.json();
    assert.match(body.error, /Não autorizado/);
  });

  it("Deve repassar o usuário autenticado com sucesso e status 200", async () => {
    const mockSession = {
      user: { id: "user_123", name: "Bruno Cordeiro", email: "bruno@cordeiro.com", role: "ADMIN" },
      expires: "2099-01-01",
    };
    const authenticatedAuth = createWithAuth(async () => mockSession as any);

    const handler = authenticatedAuth(async (req, ctx, { user }) => {
      return NextResponse.json({ success: true, user: user.name });
    });

    const fakeReq = new NextRequest("http://localhost:3000/api/test");
    const response = await handler(fakeReq, {});
    assert.strictEqual(response.status, 200);

    const body = await response.json();
    assert.strictEqual(body.user, "Bruno Cordeiro");
  });

  it("Deve capturar exceções internas e retornar status 500 sem vazar stack trace", async () => {
    const mockSession = {
      user: { id: "user_123", name: "Bruno Cordeiro" },
      expires: "2099-01-01",
    };
    const authenticatedAuth = createWithAuth(async () => mockSession as any);

    const handler = authenticatedAuth(async () => {
      throw new Error("Falha no banco de dados simulada");
    });

    const fakeReq = new NextRequest("http://localhost:3000/api/test");
    const response = await handler(fakeReq, {});
    assert.strictEqual(response.status, 500);

    const body = await response.json();
    assert.strictEqual(body.error, "Falha no banco de dados simulada");
  });
});
