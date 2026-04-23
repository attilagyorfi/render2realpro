import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricCard } from "@/components/dashboard/metric-card";

describe("MetricCard", () => {
  it("renders a label and value", () => {
    render(<MetricCard label="Jobs Today" value="12" meta="+8%" />);
    expect(screen.getByText("Jobs Today")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("+8%")).toBeInTheDocument();
  });
});
