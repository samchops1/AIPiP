import request from "supertest";
import app from "../index";

describe("RBAC + DRY_RUN", () => {
  test("forbids without role on PIP creation", async () => {
    const res = await request(app).post("/api/pips").send({});
    expect(res.status).toBe(403);
  });

  test("blocks terminate when DRY_RUN", async () => {
    process.env.DRY_RUN = "true";
    const res = await request(app)
      .post("/api/evaluate-terminations")
      .set("x-demo-role", "hr")
      .send({ legal_signoff: true, hr_signoff: true, risk_flags: [] });
    expect(res.status).toBe(409);
  });
});

