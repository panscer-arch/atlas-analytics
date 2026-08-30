import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BriefcaseBusiness,
  Check,
  ExternalLink,
  FolderKanban,
  GitBranch,
  LayoutGrid,
  Network,
  PanelsTopLeft,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/teamGraph.css";

const STORAGE_KEY = "supersus.teamGraph.v3";

const PROJECT_CATEGORIES = {
  product: { label: "Продукт", color: "#3f7c67" },
  growth: { label: "Маркетинг", color: "#bd632d" },
  content: { label: "Контент", color: "#7b61a8" },
  tech: { label: "Разработка", color: "#39739a" },
  operations: { label: "Операции", color: "#a07a2a" },
};

const INITIAL_MEMBERS = [
  ["member-filipino", "Филиппинец", "Партизанский маркетинг", "FP"],
  ["member-rotenberg", "Ротенберг", "Вебинары · P2P · MLM CRM", "РТ"],
  ["member-nikita", "Никита", "RevShare", "НК"],
  ["member-bruno", "Бруно", "Messenger · Telegram · Knowledge", "БР"],
  ["member-denis", "Денис", "Vibe coding advisor", "ДН"],
  ["member-digitex", "Digitex", "A Wallet · Analytics", "DX"],
  ["member-kostya", "Костя", "CRM YouTube", "КС"],
  ["member-mari", "Mari", "CRM листинги", "MR"],
  ["member-ivanov", "Иванов", "ЛК · Боты · Кампании", "ИВ"],
  ["member-china", "Китаец", "Smart contract ЛК", "CN"],
];

const INITIAL_PROJECTS = [
  ["project-stories", "Atlas Stories", "content"],
  ["project-live", "Atlas Live", "content"],
  ["project-guerrilla", "Партизанский маркетинг", "growth"],
  ["project-webinars", "Вебинары", "growth"],
  ["project-p2p", "P2P", "product"],
  ["project-mlm-crm", "MLM CRM", "operations"],
  ["project-revshare", "RevShare", "product"],
  ["project-messenger", "Messenger", "product"],
  ["project-telegram-invite", "Telegram инвайтинг", "growth"],
  ["project-knowledge", "База знаний", "content"],
  ["project-vibecoding", "Вайбкодинг", "tech"],
  ["project-wallet", "A Wallet", "product"],
  ["project-analytics", "Analytics", "operations"],
  ["project-youtube-crm", "CRM YouTube", "growth"],
  ["project-listings-crm", "CRM листинги", "growth"],
  ["project-cabinet", "Маркетинг ЛК", "growth"],
  ["project-telegram-bot", "Telegram бот", "tech"],
  ["project-voting", "Голосование", "product"],
  ["project-campaigns", "Кампании", "growth"],
  ["project-smart-contract", "Smart contract ЛК", "tech"],
];

const INITIAL_ASSIGNMENTS = [
  ["member-filipino", "project-guerrilla"],
  ["member-rotenberg", "project-webinars"],
  ["member-rotenberg", "project-p2p"],
  ["member-rotenberg", "project-mlm-crm"],
  ["member-nikita", "project-revshare"],
  ["member-bruno", "project-messenger"],
  ["member-bruno", "project-telegram-invite"],
  ["member-bruno", "project-knowledge"],
  ["member-denis", "project-vibecoding"],
  ["member-digitex", "project-wallet"],
  ["member-digitex", "project-analytics"],
  ["member-kostya", "project-youtube-crm"],
  ["member-mari", "project-listings-crm"],
  ["member-ivanov", "project-cabinet"],
  ["member-ivanov", "project-telegram-bot"],
  ["member-ivanov", "project-voting"],
  ["member-ivanov", "project-campaigns"],
  ["member-china", "project-smart-contract"],
];

function buildInitialGraph() {
  const memberNodes = INITIAL_MEMBERS.map(([id, label, role, initials], index) => ({
    id,
    type: "member",
    position: { x: 60, y: 55 + index * 160 },
    data: { label, role, initials, status: "active", layoutVersion: 2 },
  }));

  const assignmentsByMember = new Map(INITIAL_MEMBERS.map(([id]) => [id, []]));
  INITIAL_ASSIGNMENTS.forEach(([memberId, projectId]) => assignmentsByMember.get(memberId)?.push(projectId));
  const projectPositions = new Map();
  INITIAL_MEMBERS.forEach(([memberId], memberIndex) => {
    (assignmentsByMember.get(memberId) || []).forEach((projectId, projectIndex) => {
      projectPositions.set(projectId, {
        x: 430 + (projectIndex % 2) * 220,
        y: 45 + memberIndex * 160 + Math.floor(projectIndex / 2) * 72,
      });
    });
  });
  const unassignedProjectIds = INITIAL_PROJECTS
    .map(([id]) => id)
    .filter((id) => !projectPositions.has(id));
  unassignedProjectIds.forEach((projectId, index) => {
    projectPositions.set(projectId, {
      x: 430 + (index % 2) * 220,
      y: 45 + INITIAL_MEMBERS.length * 160 + Math.floor(index / 2) * 72,
    });
  });

  const projectNodes = INITIAL_PROJECTS.map(([id, label, category], index) => ({
    id,
    type: "project",
    position: projectPositions.get(id) || { x: 430, y: 45 + index * 72 },
    data: { label, category, status: "active", layoutVersion: 2 },
  }));
  const edges = INITIAL_ASSIGNMENTS.map(([source, target], index) => ({
    id: `assignment-${index + 1}`,
    source,
    target,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  }));
  return { nodes: [...memberNodes, ...projectNodes], edges };
}

function readGraph() {
  if (typeof window === "undefined") return buildInitialGraph();
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored?.nodes)
      && Array.isArray(stored?.edges)
      && stored.nodes.every((node) => node.data?.layoutVersion === 2)) return stored;
  } catch {
    // A damaged local snapshot should never block the team map.
  }
  return buildInitialGraph();
}

function MemberNode({ data, selected }) {
  return (
    <article className={`team-node team-node-member${selected ? " is-selected" : ""}`}>
      <div className="team-node-avatar">{data.initials || data.label.slice(0, 2).toUpperCase()}</div>
      <div>
        <strong>{data.label}</strong>
        <span>{data.role || "Роль не указана"}</span>
      </div>
      <Handle type="source" position={Position.Right} className="team-node-handle" />
    </article>
  );
}

function ProjectNode({ data, selected }) {
  const category = PROJECT_CATEGORIES[data.category] || PROJECT_CATEGORIES.product;
  return (
    <article className={`team-node team-node-project${selected ? " is-selected" : ""}`} style={{ "--project-color": category.color }}>
      <Handle type="target" position={Position.Left} className="team-node-handle" />
      <span className="team-node-project-icon"><BriefcaseBusiness size={15} /></span>
      <div>
        <strong>{data.label}</strong>
        <span>{category.label}</span>
      </div>
    </article>
  );
}

const NODE_TYPES = { member: MemberNode, project: ProjectNode };

function TeamGraphBoard() {
  const initialGraph = useMemo(readGraph, []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [selectedNodeId, setSelectedNodeId] = useState(initialGraph.nodes[0]?.id || "");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [createMode, setCreateMode] = useState("");
  const [newName, setNewName] = useState("");
  const [newMeta, setNewMeta] = useState("");
  const [search, setSearch] = useState("");
  const [saveState, setSaveState] = useState("Сохранено");
  const [flowInstance, setFlowInstance] = useState(null);
  const [viewMode, setViewMode] = useState("people");
  const saveTimerRef = useRef(0);

  const members = useMemo(() => nodes.filter((node) => node.type === "member"), [nodes]);
  const projects = useMemo(() => nodes.filter((node) => node.type === "project"), [nodes]);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) || null;

  const projectIdsByMember = useMemo(() => {
    const result = new Map(members.map((member) => [member.id, []]));
    edges.forEach((edge) => result.get(edge.source)?.push(edge.target));
    return result;
  }, [edges, members]);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const assignedProjectIds = useMemo(() => new Set(edges.map((edge) => edge.target)), [edges]);
  const unassignedProjects = useMemo(() => projects.filter((project) => !assignedProjectIds.has(project.id)), [assignedProjectIds, projects]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const assignedLabels = (projectIdsByMember.get(member.id) || [])
        .map((projectId) => projectById.get(projectId)?.data.label || "")
        .join(" ");
      return `${member.data.label} ${member.data.role || ""} ${assignedLabels}`.toLowerCase().includes(query);
    });
  }, [members, projectById, projectIdsByMember, search]);

  useEffect(() => {
    setSaveState("Сохраняю...");
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
      setSaveState("Сохранено");
    }, 220);
    return () => window.clearTimeout(saveTimerRef.current);
  }, [nodes, edges]);

  const onConnect = useCallback((connection) => {
    const source = nodes.find((node) => node.id === connection.source);
    const target = nodes.find((node) => node.id === connection.target);
    if (source?.type !== "member" || target?.type !== "project") return;
    setEdges((current) => {
      if (current.some((edge) => edge.source === source.id && edge.target === target.id)) return current;
      return addEdge({
        ...connection,
        id: `assignment-${Date.now()}`,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      }, current);
    });
  }, [nodes, setEdges]);

  function updateSelectedNode(patch) {
    if (!selectedNode) return;
    setNodes((current) => current.map((node) => node.id === selectedNode.id
      ? { ...node, data: { ...node.data, ...patch } }
      : node));
  }

  function createNode(event) {
    event.preventDefault();
    const label = newName.trim();
    if (!label) return;
    const id = `${createMode}-${Date.now()}`;
    const isMember = createMode === "member";
    const nextNode = {
      id,
      type: createMode,
      position: isMember ? { x: 120, y: 120 } : { x: 800, y: 120 },
      data: isMember
        ? { label, role: newMeta.trim() || "Новый участник", initials: label.slice(0, 2).toUpperCase(), status: "active", layoutVersion: 2 }
        : { label, category: newMeta || "product", status: "active", layoutVersion: 2 },
    };
    setNodes((current) => [...current, nextNode]);
    setSelectedNodeId(id);
    setSelectedEdgeId("");
    setNewName("");
    setNewMeta("");
    setCreateMode("");
    window.setTimeout(() => flowInstance?.fitView({ padding: 0.18, duration: 450 }), 60);
  }

  function deleteSelected() {
    if (selectedEdge) {
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdge.id));
      setSelectedEdgeId("");
      return;
    }
    if (!selectedNode) return;
    setNodes((current) => current.filter((node) => node.id !== selectedNode.id));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNodeId("");
  }

  function toggleAssignment(memberId, projectId) {
    setEdges((current) => {
      const existing = current.find((edge) => edge.source === memberId && edge.target === projectId);
      if (existing) return current.filter((edge) => edge.id !== existing.id);
      return [...current, {
        id: `assignment-${Date.now()}`,
        source: memberId,
        target: projectId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      }];
    });
  }

  function resetGraph() {
    const next = buildInitialGraph();
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNodeId(next.nodes[0]?.id || "");
    setSelectedEdgeId("");
    window.setTimeout(() => flowInstance?.fitView({ padding: 0.12, duration: 500 }), 50);
  }

  function openMemberMap(memberId) {
    setSelectedNodeId(memberId);
    setSelectedEdgeId("");
    setViewMode("map");
  }

  function openProjectMap(projectId) {
    setSelectedNodeId(projectId);
    setSelectedEdgeId("");
    setViewMode("map");
  }

  function showFullMap() {
    setSelectedNodeId("");
    setSelectedEdgeId("");
    window.setTimeout(() => flowInstance?.fitView({ padding: 0.12, duration: 450 }), 60);
  }

  const visibleNodeIds = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return new Set(nodes.map((node) => node.id));
    const direct = nodes.filter((node) => `${node.data.label} ${node.data.role || ""}`.toLowerCase().includes(query));
    const ids = new Set(direct.map((node) => node.id));
    edges.forEach((edge) => {
      if (ids.has(edge.source) || ids.has(edge.target)) {
        ids.add(edge.source);
        ids.add(edge.target);
      }
    });
    return ids;
  }, [edges, nodes, search]);

  const focusNodeIds = useMemo(() => {
    if (!selectedNode) return new Set();
    const result = new Set([selectedNode.id]);
    edges.forEach((edge) => {
      if (edge.source === selectedNode.id || edge.target === selectedNode.id) {
        result.add(edge.source);
        result.add(edge.target);
      }
    });
    return result;
  }, [edges, selectedNode]);

  const displayNodes = nodes.map((node) => ({
    ...node,
    hidden: !visibleNodeIds.has(node.id) || (focusNodeIds.size > 0 && !focusNodeIds.has(node.id)),
  }));
  const displayEdges = edges.map((edge) => ({
    ...edge,
    hidden: !visibleNodeIds.has(edge.source)
      || !visibleNodeIds.has(edge.target)
      || (focusNodeIds.size > 0 && (!focusNodeIds.has(edge.source) || !focusNodeIds.has(edge.target))),
    animated: edge.id === selectedEdgeId,
    style: {
      stroke: edge.id === selectedEdgeId || edge.source === selectedNodeId || edge.target === selectedNodeId ? "#eb6a25" : "#9da6a2",
      strokeWidth: edge.id === selectedEdgeId || edge.source === selectedNodeId || edge.target === selectedNodeId ? 2.4 : 1.4,
    },
  }));

  const selectedAssignments = selectedNode?.type === "member"
    ? new Set(edges.filter((edge) => edge.source === selectedNode.id).map((edge) => edge.target))
    : new Set();

  return (
    <section className="team-graph-board">
      <header className="team-graph-hero">
        <div>
          <span className="team-graph-kicker">SuperSUS · команда</span>
          <h2>Кто за что отвечает</h2>
          <p>Единый рабочий экран команды: роли, закреплённые проекты и направления, которым ещё нужен ответственный.</p>
        </div>
        <div className="team-graph-stats" aria-label="Сводка команды">
          <article><UsersRound size={18} /><span>Участники</span><strong>{members.length}</strong></article>
          <article><BriefcaseBusiness size={18} /><span>Проекты</span><strong>{projects.length}</strong></article>
          <article><GitBranch size={18} /><span>Связи</span><strong>{edges.length}</strong></article>
          <article className={projects.length - new Set(edges.map((edge) => edge.target)).size ? "is-warning" : "is-ok"}>
            <Check size={18} /><span>Без владельца</span><strong>{Math.max(projects.length - new Set(edges.map((edge) => edge.target)).size, 0)}</strong>
          </article>
        </div>
      </header>

      <div className="team-graph-toolbar">
        <label className="team-graph-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти человека или проект" />
          {search ? <button type="button" onClick={() => setSearch("")} aria-label="Очистить поиск"><X size={15} /></button> : null}
        </label>
        <div className="team-graph-view-switch" role="tablist" aria-label="Режим отображения команды">
          <button type="button" className={viewMode === "people" ? "is-active" : ""} onClick={() => setViewMode("people")} role="tab" aria-selected={viewMode === "people"}><PanelsTopLeft size={15} /> По людям</button>
          <button type="button" className={viewMode === "map" ? "is-active" : ""} onClick={() => setViewMode("map")} role="tab" aria-selected={viewMode === "map"}><Network size={15} /> Карта связей</button>
        </div>
        <div className="team-graph-toolbar-actions">
          <button type="button" onClick={() => setCreateMode("member")}><UserRound size={16} /> Участник</button>
          <button type="button" onClick={() => setCreateMode("project")}><BriefcaseBusiness size={16} /> Проект</button>
          {viewMode === "map" ? <button type="button" className="is-icon" onClick={showFullMap} aria-label="Показать всю карту" title="Показать всю карту"><LayoutGrid size={17} /></button> : null}
          <button type="button" className="is-icon" onClick={resetGraph} aria-label="Вернуть исходную схему" title="Вернуть исходную схему"><RotateCcw size={17} /></button>
          <span className={`team-graph-save${saveState === "Сохранено" ? " is-saved" : ""}`}>{saveState}</span>
        </div>
      </div>

      {createMode ? (
        <form className="team-graph-create" onSubmit={createNode}>
          <div><span>{createMode === "member" ? "Новый участник" : "Новый проект"}</span><strong>{createMode === "member" ? "Добавьте человека на карту" : "Добавьте направление или продукт"}</strong></div>
          <input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={createMode === "member" ? "Имя" : "Название проекта"} />
          {createMode === "member" ? (
            <input value={newMeta} onChange={(event) => setNewMeta(event.target.value)} placeholder="Роль или зона ответственности" />
          ) : (
            <select value={newMeta || "product"} onChange={(event) => setNewMeta(event.target.value)}>
              {Object.entries(PROJECT_CATEGORIES).map(([value, category]) => <option value={value} key={value}>{category.label}</option>)}
            </select>
          )}
          <button type="submit" className="is-primary"><Plus size={16} /> Добавить</button>
          <button type="button" className="is-icon" onClick={() => setCreateMode("")} aria-label="Закрыть форму"><X size={17} /></button>
        </form>
      ) : null}

      {viewMode === "people" ? (
        <div className="team-responsibility-view">
          <div className="team-responsibility-heading">
            <div><span>Команда</span><strong>{filteredMembers.length} участников</strong></div>
            <p>В каждой карточке указана зона ответственности и все закреплённые проекты.</p>
          </div>
          <div className="team-responsibility-grid">
            {filteredMembers.map((member) => {
              const memberProjects = (projectIdsByMember.get(member.id) || []).map((projectId) => projectById.get(projectId)).filter(Boolean);
              return (
                <article className="team-responsibility-card" key={member.id}>
                  <header>
                    <span className="team-responsibility-avatar">{member.data.initials || member.data.label.slice(0, 2).toUpperCase()}</span>
                    <div><strong>{member.data.label}</strong><span><i /> В команде</span></div>
                    <button type="button" onClick={() => openMemberMap(member.id)} aria-label={`Открыть связи: ${member.data.label}`} title="Открыть на карте"><ExternalLink size={16} /></button>
                  </header>
                  <div className="team-responsibility-role">
                    <span>Зона ответственности</span>
                    <p>{member.data.role || "Роль пока не указана"}</p>
                  </div>
                  <div className="team-responsibility-projects">
                    <div><span>Ведёт проекты</span><strong>{memberProjects.length}</strong></div>
                    {memberProjects.length ? (
                      <ul>
                        {memberProjects.map((project) => {
                          const category = PROJECT_CATEGORIES[project.data.category] || PROJECT_CATEGORIES.product;
                          return <li key={project.id} style={{ "--responsibility-color": category.color }}><FolderKanban size={14} /><span>{project.data.label}</span><small>{category.label}</small></li>;
                        })}
                      </ul>
                    ) : <p className="team-responsibility-empty">Проекты ещё не назначены</p>}
                  </div>
                  <footer>
                    <button type="button" onClick={() => openMemberMap(member.id)}><GitBranch size={15} /> Изменить назначения</button>
                  </footer>
                </article>
              );
            })}
          </div>
          {!filteredMembers.length ? <div className="team-responsibility-no-results"><Search size={22} /><strong>Ничего не найдено</strong><span>Попробуйте изменить запрос.</span></div> : null}
          <section className={`team-unassigned-projects${unassignedProjects.length ? " is-warning" : " is-clear"}`}>
            <div>
              <span><FolderKanban size={18} /> Без ответственного</span>
              <strong>{unassignedProjects.length}</strong>
            </div>
            {unassignedProjects.length ? (
              <ul>{unassignedProjects.map((project) => <li key={project.id}><i style={{ background: PROJECT_CATEGORIES[project.data.category]?.color }} />{project.data.label}<button type="button" onClick={() => openProjectMap(project.id)}>Назначить</button></li>)}</ul>
            ) : <p>У каждого проекта есть ответственный.</p>}
          </section>
        </div>
      ) : <div className="team-graph-workspace">
        <div className="team-graph-canvas" aria-label="Карта команды и проектов">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setFlowInstance}
            onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(""); }}
            onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(""); }}
            onPaneClick={showFullMap}
            onNodesDelete={(deleted) => {
              const ids = new Set(deleted.map((node) => node.id));
              setEdges((current) => current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)));
            }}
            fitView
            fitViewOptions={{
              padding: 0.16,
              maxZoom: 0.86,
              nodes: focusNodeIds.size ? Array.from(focusNodeIds, (id) => ({ id })) : undefined,
            }}
            minZoom={0.25}
            maxZoom={1.7}
            defaultEdgeOptions={{ type: "smoothstep" }}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => node.type === "member" ? "#eb6a25" : (PROJECT_CATEGORIES[node.data.category]?.color || "#3f7c67")}
              maskColor="rgba(246, 247, 246, 0.72)"
            />
            <Controls showInteractive={false} />
            <Background color="#cbd2ce" gap={26} size={1} />
          </ReactFlow>
          <div className="team-graph-legend">
            <span><i className="is-member" /> Человек</span>
            <span><i className="is-project" /> Проект</span>
            <small>Перетаскивайте узлы и соединяйте точки</small>
          </div>
        </div>

        <aside className="team-graph-inspector">
          {selectedNode ? (
            <>
              <div className="team-graph-inspector-head">
                <span>{selectedNode.type === "member" ? <UserRound size={17} /> : <BriefcaseBusiness size={17} />}{selectedNode.type === "member" ? "Участник" : "Проект"}</span>
                <button type="button" onClick={deleteSelected} aria-label="Удалить выбранный элемент" title="Удалить"><Trash2 size={16} /></button>
              </div>
              <label><span>Название</span><input value={selectedNode.data.label} onChange={(event) => updateSelectedNode({ label: event.target.value })} /></label>
              {selectedNode.type === "member" ? (
                <>
                  <label><span>Роль и ответственность</span><textarea value={selectedNode.data.role || ""} onChange={(event) => updateSelectedNode({ role: event.target.value })} rows="3" /></label>
                  <div className="team-graph-assignments-head"><span>Проекты</span><strong>{selectedAssignments.size}</strong></div>
                  <div className="team-graph-assignment-list">
                    {projects.map((project) => {
                      const assigned = selectedAssignments.has(project.id);
                      return (
                        <button type="button" className={assigned ? "is-assigned" : ""} key={project.id} onClick={() => toggleAssignment(selectedNode.id, project.id)}>
                          <i style={{ background: PROJECT_CATEGORIES[project.data.category]?.color }} />
                          <span>{project.data.label}</span>
                          {assigned ? <Check size={15} /> : <Plus size={15} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <label><span>Категория</span><select value={selectedNode.data.category || "product"} onChange={(event) => updateSelectedNode({ category: event.target.value })}>{Object.entries(PROJECT_CATEGORIES).map(([value, category]) => <option value={value} key={value}>{category.label}</option>)}</select></label>
                  <div className="team-graph-assignments-head"><span>Ответственные</span><strong>{edges.filter((edge) => edge.target === selectedNode.id).length}</strong></div>
                  <div className="team-graph-owner-list">
                    {members.map((member) => {
                      const assigned = edges.some((edge) => edge.source === member.id && edge.target === selectedNode.id);
                      return (
                        <button type="button" className={assigned ? "is-assigned" : ""} key={member.id} onClick={() => toggleAssignment(member.id, selectedNode.id)}>
                          <span>{member.data.initials}</span>
                          <strong>{member.data.label}</strong>
                          {assigned ? <Check size={15} /> : <Plus size={15} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : selectedEdge ? (
            <div className="team-graph-edge-card">
              <GitBranch size={24} />
              <span>Связь ответственности</span>
              <strong>{nodes.find((node) => node.id === selectedEdge.source)?.data.label}</strong>
              <small>ведёт проект</small>
              <strong>{nodes.find((node) => node.id === selectedEdge.target)?.data.label}</strong>
              <button type="button" onClick={deleteSelected}><Trash2 size={15} /> Удалить связь</button>
            </div>
          ) : (
            <div className="team-graph-empty-inspector">
              <GitBranch size={28} />
              <strong>Выберите элемент</strong>
              <p>Нажмите на человека, проект или линию связи, чтобы увидеть детали и изменить назначения.</p>
            </div>
          )}
        </aside>
      </div>}
    </section>
  );
}

export default TeamGraphBoard;
