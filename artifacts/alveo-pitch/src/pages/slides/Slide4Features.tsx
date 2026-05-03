export default function Slide4Features() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#F4F4F0",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#111111",
        display: "grid",
        gridTemplateColumns: "1fr 3fr",
        gridTemplateRows: "1fr auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          borderRight: "0.2vw solid #111111",
          borderBottom: "0.2vw solid #111111",
          padding: "4vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "1vw",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 700,
              marginBottom: "1vh",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Sect. 03
          </div>
          <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace" }}>
            FEATURES
          </div>
        </div>

        <div>
          <div
            style={{
              width: "3vw",
              height: "3vw",
              backgroundColor: "#B5956A",
              borderRadius: "50%",
              marginBottom: "2vh",
            }}
          />
          <div
            style={{
              fontSize: "1.5vw",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Alv&eacute;o
          </div>
        </div>
      </div>

      <div
        style={{
          borderBottom: "0.2vw solid #111111",
          padding: "5vw 5vw 4vw 5vw",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "4vw",
            right: "4vw",
            fontSize: "1vw",
            fontFamily: "'DM Mono', monospace",
            color: "#666666",
            letterSpacing: "0.05em",
          }}
        >
          [ CAPABILITIES ]
        </div>

        <h2
          style={{
            fontSize: "4.5vw",
            fontWeight: 700,
            lineHeight: 1,
            margin: "0 0 2.5vh 0",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
          }}
        >
          Key Features
        </h2>

        <div style={{ width: "8vw", height: "0.4vw", backgroundColor: "#B5956A", marginBottom: "5vh" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2vw" }}>
          <div style={{ backgroundColor: "#111111", color: "#F4F4F0", padding: "2.5vw 2vw" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "2vh", letterSpacing: "0.05em" }}>001</div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Configurator</div>
            <div style={{ width: "3vw", height: "0.2vw", backgroundColor: "#B5956A", marginBottom: "1.5vh" }} />
            <div style={{ fontSize: "1.4vw", color: "#CCCCCC", lineHeight: 1.4 }}>Guided room and wardrobe input</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "2.5vw 2vw" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "2vh", letterSpacing: "0.05em" }}>002</div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Layout Engine</div>
            <div style={{ width: "3vw", height: "0.2vw", backgroundColor: "#111111", marginBottom: "1.5vh" }} />
            <div style={{ fontSize: "1.4vw", color: "#333333", lineHeight: 1.4 }}>Proprietary zone allocation algorithm</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "2.5vw 2vw" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "2vh", letterSpacing: "0.05em" }}>003</div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>PDF / SVG Export</div>
            <div style={{ width: "3vw", height: "0.2vw", backgroundColor: "#111111", marginBottom: "1.5vh" }} />
            <div style={{ fontSize: "1.4vw", color: "#333333", lineHeight: 1.4 }}>Professional-grade output ready to build or share</div>
          </div>
        </div>
      </div>

      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "2vw 4vw",
          fontFamily: "'DM Mono', monospace",
          fontSize: "1vw",
          textTransform: "uppercase",
          backgroundColor: "#111111",
          color: "#F4F4F0",
          letterSpacing: "0.05em",
        }}
      >
        <div>Alv&eacute;o Closet Configurator</div>
        <div style={{ display: "flex", gap: "2vw" }}>
          <span>SYS.IDX: 004</span>
          <span>PAGE: 04</span>
        </div>
      </div>
    </div>
  );
}
