import React from "react";
import { AlertTriangle } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:"40px", fontFamily:"'IBM Plex Sans',sans-serif", maxWidth:"600px", margin:"40px auto" }}>
          <div style={{ background:"#FDECEC", border:"1.5px solid #C0392B44", borderRadius:"16px", padding:"24px" }}>
            <div style={{ fontSize:"16px", fontWeight:900, color:"#C0392B", marginBottom:"8px" }}><AlertTriangle size={16} style={{display:"inline",marginRight:6,verticalAlign:"middle"}}/>Something went wrong</div>
            <div style={{ fontSize:"15px", color:"#1A2E52", fontWeight:600, marginBottom:"12px" }}>Error details (copy these to report the issue):</div>
            <pre style={{ background:"white", borderRadius:"10px", padding:"12px", fontSize:"15px", color:"#C0392B", overflowX:"auto", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
              {this.state.error?.message}{"\n\n"}{this.state.error?.stack}
            </pre>
            <button onClick={() => this.setState({error:null})} style={{ marginTop:"14px", background:"#1A2E52", color:"white", border:"none", borderRadius:"10px", padding:"8px 20px", fontSize:"15px", fontWeight:800, fontFamily:"'IBM Plex Sans',sans-serif", cursor:"pointer" }}>Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
