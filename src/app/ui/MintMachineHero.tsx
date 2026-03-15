"use client";

import Image from "next/image";

export function MintMachineHero({ printing }: { printing?: boolean }) {
  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(1200px 400px at 20% 0%, rgba(34,197,94,0.18), transparent 60%), radial-gradient(900px 340px at 80% 30%, rgba(199,249,204,0.10), transparent 55%), rgba(0,0,0,0.22)",
        padding: 18,
        display: "grid",
        placeItems: "center",
        minHeight: 220,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -40,
          background:
            "conic-gradient(from 180deg at 50% 50%, rgba(34,197,94,0.10), rgba(255,255,255,0.05), rgba(34,197,94,0.10))",
          filter: "blur(26px)",
          opacity: printing ? 0.9 : 0.45,
          transform: printing ? "scale(1.05)" : "scale(1.0)",
          transition: "all 300ms ease",
        }}
      />

      <div style={{ display: "grid", placeItems: "center", gap: 10, position: "relative" }}>
        <Image
          src="/paperProtocolLogo.png"
          alt="$PAPER"
          width={140}
          height={140}
          priority
          style={{
            borderRadius: 26,
            boxShadow: printing
              ? "0 0 0 1px rgba(34,197,94,0.35), 0 18px 60px rgba(34,197,94,0.28)"
              : "0 0 0 1px rgba(255,255,255,0.10), 0 18px 60px rgba(0,0,0,0.45)",
            transform: printing ? "translateY(-2px) scale(1.02)" : "translateY(0px) scale(1)",
            transition: "all 220ms ease",
          }}
        />
        <div style={{ opacity: 0.85, fontSize: 13 }}>
          {printing ? "Printing receipt…" : "Mine by producing proof-of-work artifacts."}
        </div>
      </div>
    </div>
  );
}
