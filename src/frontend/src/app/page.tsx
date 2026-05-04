/**
 * Página principal do CryptoDraw
 * Frontend React - Landing Page
 */

// Placeholder para componentes que serão implementados
const Hero = () => (
  <div className="hero">
    <h1>CryptoDraw - Loteria Descentralizada</h1>
    <p>Participe da Lotofácil e SuperSete na blockchain Harmony</p>
  </div>
);

const GameSelector = () => (
  <div className="game-selector">
    <h2>Escolha seu Jogo</h2>
    <div className="games">
      <div className="game-card">
        <h3>Lotofácil</h3>
        <p>15 números de 1 a 25</p>
      </div>
      <div className="game-card">
        <h3>SuperSete</h3>
        <p>7 colunas de 0 a 9</p>
      </div>
    </div>
  </div>
);

const RecentDraws = () => (
  <div className="recent-draws">
    <h2>Sorteios Recentes</h2>
    <div className="draws-list">
      {/* Lista de sorteios será implementada */}
    </div>
  </div>
);

const Statistics = () => (
  <div className="statistics">
    <h2>Estatísticas</h2>
    <div className="stats-grid">
      {/* Estatísticas serão implementadas */}
    </div>
  </div>
);

// Componente principal da página
export default function HomePage() {
  return (
    <div className="home-page">
      <Hero />
      <GameSelector />
      <RecentDraws />
      <Statistics />
    </div>
  );
}