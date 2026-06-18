// ============================================================
//  src/components/CardHand.jsx
//  Resource cards in a proper fan arc — middle cards rise,
//  edge cards dip. Newly gained cards glow with a +1 badge.
// ============================================================

import { T, RES } from "../game/constants";

function CardBack({ index, total }) {
  const center = (total - 1) / 2;
  const offset = index - center;
  const angle = offset * 5;
  const lift = -(offset * offset) * 1.8;
  return (
    <div style={{
      width: 48, height: 68,
      background: "linear-gradient(135deg, #3a2a18, #5a4028)",
      border: "2px solid #2a1a0c", borderRadius: 6,
      transform: `rotate(${angle}deg) translateY(${lift}px)`,
      transformOrigin: "bottom center",
      marginLeft: index > 0 ? -20 : 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 4px #00000044",
      zIndex: index, position: "relative",
    }}>
      <span style={{ fontSize: 16, opacity: 0.4 }}>🂠</span>
    </div>
  );
}

function Card({ resource, index, total, glowing, gained, onClick, disabled }) {
  const r = RES[resource];
  const center = (total - 1) / 2;
  const offset = index - center;
  const angle = offset * (total > 10 ? 3 : total > 6 ? 4 : 5);
  const maxOff = (total - 1) / 2;
  const lift = ((offset * offset) - (maxOff * maxOff)) * 1.2;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: 56, height: 78,
        background: gained
          ? `linear-gradient(180deg, ${r.color}22, #fffdf6, #f0e8d4)`
          : "linear-gradient(180deg, #fffdf6, #f0e8d4)",
        border: `2px solid ${gained ? r.color : glowing ? T.gold : "#c8b89a"}`,
        borderRadius: 8,
        transform: `rotate(${angle}deg) translateY(${lift}px)`,
        transformOrigin: "bottom center",
        marginLeft: index > 0 ? -16 : 0,
        cursor: disabled ? "default" : "pointer",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
        boxShadow: gained
          ? `0 0 16px ${r.color}aa, 0 3px 8px #00000044`
          : glowing ? `0 0 10px ${T.gold}66, 0 3px 6px #00000044`
          : "0 2px 5px #00000033",
        transition: "transform 0.2s, box-shadow 0.2s",
        position: "relative", zIndex: index, userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.transform = `rotate(${angle * 0.5}deg) translateY(${lift - 18}px) scale(1.08)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = `rotate(${angle}deg) translateY(${lift}px)`;
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 7,
        background: r.color, borderRadius: "6px 6px 0 0",
      }} />
      <span style={{ fontSize: 26, marginTop: 6 }}>{r.emoji}</span>
      <span style={{ fontSize: 9, color: T.ink, fontWeight: 600, letterSpacing: 0.5 }}>
        {r.label.toUpperCase()}
      </span>
      {gained && (
        <div style={{
          position: "absolute", top: -8, right: -6,
          background: r.color, color: "#fff",
          fontSize: 10, fontWeight: 700,
          padding: "1px 5px", borderRadius: 8,
          animation: "popIn 0.4s ease",
        }}>+1</div>
      )}
    </div>
  );
}

export default function CardHand({ hand, isMe, trading, onClickCard, lastGained = {} }) {
  if (!isMe) {
    const total = Object.values(hand).reduce((a, b) => a + b, 0);
    if (total === 0) return <span style={{ color: T.inkSoft, fontSize: 13, fontStyle: "italic" }}>no cards</span>;
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 24px" }}>
        {Array.from({ length: total }).map((_, i) => <CardBack key={i} index={i} total={total} />)}
      </div>
    );
  }

  const gainTracker = {};
  Object.entries(lastGained).forEach(([r, n]) => { gainTracker[r] = n; });

  const cards = [];
  Object.entries(RES).forEach(([key]) => {
    for (let i = 0; i < (hand[key] || 0); i++) {
      const isNew = (gainTracker[key] || 0) > 0;
      if (isNew) gainTracker[key]--;
      cards.push({ resource: key, idx: cards.length, gained: isNew });
    }
  });

  if (cards.length === 0) {
    return <span style={{ color: T.inkSoft, fontSize: 13, fontStyle: "italic" }}>no cards in hand</span>;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 28px", minHeight: 100 }}>
      <style>{`@keyframes popIn{0%{transform:scale(0);opacity:0}60%{transform:scale(1.3)}100%{transform:scale(1);opacity:1}}`}</style>
      {cards.map((c) => (
        <Card key={`${c.resource}-${c.idx}`} resource={c.resource}
          index={c.idx} total={cards.length} glowing={trading} gained={c.gained}
          onClick={() => onClickCard && onClickCard(c.resource)} disabled={!trading} />
      ))}
    </div>
  );
}
