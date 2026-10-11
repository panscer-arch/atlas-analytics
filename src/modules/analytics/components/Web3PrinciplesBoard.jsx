import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import document from "../data/web3Principles.json";
import "./Web3PrinciplesBoard.css";

export default function Web3PrinciplesBoard() {
  return (
    <div className="web3-principles">
      <header className="analytics-surface web3-principles-header">
        <div className="web3-principles-meta">
          <Badge variant="outline">Концепция для обсуждения</Badge>
          <time dateTime="2026-09-17">{document.date}</time>
        </div>
        <h2>{document.title}</h2>
        <p>{document.status}</p>
        <Button asChild variant="outline" className="web3-principles-download">
          <a href="/materials/gate-web3-principles-2026-09-17.txt" download>Скачать текст</a>
        </Button>
      </header>

      <nav className="analytics-surface web3-principles-index" aria-label="Содержание принципов Web3">
        <h3>Шесть принципов</h3>
        <ol>
          {document.principles.map((principle) => (
            <li key={principle.id}><a href={`#web3-principle-${principle.id}`}>{principle.title}</a></li>
          ))}
        </ol>
      </nav>

      {document.principles.map((principle) => (
        <article className="analytics-surface web3-principles-card" id={`web3-principle-${principle.id}`} key={principle.id}>
          <div className="web3-principles-number" aria-hidden="true">{principle.id.padStart(2, "0")}</div>
          <div>
            <h3>{principle.title}</h3>
            {principle.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            <p className="web3-principles-meaning"><strong>Смысл:</strong> {principle.meaning}</p>
          </div>
        </article>
      ))}

      <footer className="analytics-surface web3-principles-footer">
        <h3>Важно</h3>
        <p>{document.warning}</p>
        <h4>Источники из документа</h4>
        <ul>
          <li><a href={document.sources[0]} target="_blank" rel="noreferrer">Ethereum — безопасность смарт-контрактов</a></li>
          <li><a href={document.sources[1]} target="_blank" rel="noreferrer">Investor.gov — схемы Понци</a></li>
        </ul>
      </footer>
    </div>
  );
}
