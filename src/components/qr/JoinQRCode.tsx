"use client";

import React from "react";
import QRCode from "react-qr-code";

interface JoinQRCodeProps {
  value: string;
  size?: number;
}

export function JoinQRCode({ value, size = 180 }: JoinQRCodeProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-3xl shadow-xs">
      <div style={{ height: "auto", margin: "0 auto", maxWidth: size, width: "100%" }}>
        <QRCode
          size={256}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          value={value}
          viewBox={`0 0 256 256`}
          fgColor="#0f172a" /* slate-900 */
          bgColor="#ffffff"
        />
      </div>
    </div>
  );
}
