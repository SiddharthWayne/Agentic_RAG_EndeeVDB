import { useState } from "react";
import { uploadFile } from "../api";

interface Props {
  disabled: boolean;
}

const Uploader = ({ disabled }: Props) => {
  const [status, setStatus] = useState<string>("");

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("Uploading...");
    try {
      const msg = await uploadFile(file);
      setStatus(msg);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Upload failed";
      setStatus(msg);
    }
  };

  return (
    <div className="panel" style={{ padding: 8 }}>
      <label style={{ fontWeight: 600, marginRight: 8 }}>Upload doc:</label>
      <input type="file" accept=".pdf,.txt,.md,.docx" onChange={onChange} disabled={disabled} />
      {status && <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>{status}</div>}
    </div>
  );
};

export default Uploader;
