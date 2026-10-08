import { useEffect, useMemo, useState } from "react";

const GROUPS = [
  ...Array.from({ length: 7 }, (_, i) => `SENIOR-${i + 1}`),
  "JUNIOR-1",
  "JUNIOR-2",
];
const CYCLE = ["", "P", "A", "L"];
const LABEL = { P: "Был", A: "Не был", L: "Опоздал" };
const KEY = "nextcode-attendance-v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => d.slice(8, 10) + "." + d.slice(5, 7);
const empty = () => ({ students: [], dates: [], att: {} });

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export default function App() {
  const [db, setDb] = useState(load);
  const [group, setGroup] = useState(GROUPS[0]);
  const [name, setName] = useState("");
  const [date, setDate] = useState(today());

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(db)), [db]);

  const g = db[group] || empty();
  const update = (fn) =>
    setDb((p) => ({ ...p, [group]: fn(structuredClone(p[group] || empty())) }));

  const addStudents = (e) => {
    e.preventDefault();
    const names = name.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    update((c) => {
      names.forEach((n) => c.students.push({ id: uid(), name: n }));
      return c;
    });
    setName("");
  };
  const removeStudent = (id) =>
    confirm("Удалить ученика?") &&
    update((c) => {
      c.students = c.students.filter((s) => s.id !== id);
      delete c.att[id];
      return c;
    });
  const addDate = () =>
    date &&
    update((c) => {
      if (!c.dates.includes(date)) c.dates = [...c.dates, date].sort();
      return c;
    });
  const removeDate = (d) =>
    confirm(`Удалить день ${fmt(d)}?`) &&
    update((c) => {
      c.dates = c.dates.filter((x) => x !== d);
      Object.values(c.att).forEach((a) => delete a[d]);
      return c;
    });
  const toggle = (sid, d) =>
    update((c) => {
      const a = (c.att[sid] ||= {});
      a[d] = CYCLE[(CYCLE.indexOf(a[d] || "") + 1) % CYCLE.length];
      return c;
    });
  const markAll = (d) =>
    update((c) => {
      c.students.forEach((s) => ((c.att[s.id] ||= {})[d] = "P"));
      return c;
    });

  const stats = useMemo(
    () =>
      Object.fromEntries(
        g.students.map((s) => {
          const a = g.att[s.id] || {};
          const marked = g.dates.filter((d) => a[d]);
          const here = marked.filter((d) => a[d] !== "A").length;
          return [s.id, marked.length ? Math.round((here / marked.length) * 100) : null];
        })
      ),
    [g]
  );

  const exportCsv = () => {
    const rows = [["Имя", ...g.dates, "%"]];
    g.students.forEach((s) =>
      rows.push([s.name, ...g.dates.map((d) => LABEL[g.att[s.id]?.[d]] || ""), stats[s.id] ?? ""])
    );
    const csv = "\ufeff" + rows.map((r) => r.map((v) => `"${v}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${group}.csv`;
    a.click();
  };

  return (
    <div className="app">
      <aside className="side">
        <img src="/logo.jpg" alt="NextCode" className="logo" />
        <nav>
          {GROUPS.map((x) => (
            <button key={x} className={x === group ? "grp on" : "grp"} onClick={() => setGroup(x)}>
              {x}
              <span>{db[x]?.students.length || 0}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="head">
          <h1>{group}</h1>
          <button className="btn ghost" onClick={exportCsv} disabled={!g.students.length}>
            Скачать CSV
          </button>
        </header>

        <section className="card">
          <form onSubmit={addStudents} className="row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Имя ученика (можно несколько через запятую)"
            />
            <button className="btn">Добавить ученика</button>
          </form>
          <div className="row">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="btn" onClick={addDate}>Добавить день</button>
            <div className="legend">
              <i className="dot P" /> Был <i className="dot A" /> Не был <i className="dot L" /> Опоздал
            </div>
          </div>
        </section>

        <section className="card table-wrap">
          {!g.students.length ? (
            <p className="empty">В группе пока нет учеников. Добавьте первого выше.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="name">Ученики</th>
                  {g.dates.map((d) => (
                    <th key={d}>
                      <div className="dh">
                        {fmt(d)}
                        <button title="Отметить всех «Был»" onClick={() => markAll(d)}>✓</button>
                        <button title="Удалить день" onClick={() => removeDate(d)}>×</button>
                      </div>
                    </th>
                  ))}
                  <th>%</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {g.students.map((s, i) => (
                  <tr key={s.id}>
                    <td className="name">{i + 1}. {s.name}</td>
                    {g.dates.map((d) => {
                      const v = g.att[s.id]?.[d] || "";
                      return (
                        <td key={d}>
                          <button className={`cell ${v}`} title={LABEL[v] || "Не отмечено"} onClick={() => toggle(s.id, d)}>
                            {v === "P" ? "✓" : v === "A" ? "✕" : v === "L" ? "!" : ""}
                          </button>
                        </td>
                      );
                    })}
                    <td className="pct">{stats[s.id] == null ? "—" : stats[s.id] + "%"}</td>
                    <td><button className="del" onClick={() => removeStudent(s.id)}>Удалить</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
