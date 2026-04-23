import { AppFrame } from "@/components/layout/app-frame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminView() {
  return (
    <AppFrame eyebrow="Platform administration" title="Admin">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Tenant overview</CardTitle>
            <CardDescription>
              Placeholder for future SaaS tenants, organizations, and subscription visibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This area will later manage engineering offices, visualization studios, and platform-level access.
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Usage governance</CardTitle>
            <CardDescription>
              Placeholder for provider quotas, export policy, and generation audit controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The admin surface is intentionally lightweight in this phase, but the route is ready.
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Support operations</CardTitle>
            <CardDescription>
              Future workspace for user support, onboarding, and integration activation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Drive, email, and identity-provider rollout can land here without restructuring the app shell.
          </CardContent>
        </Card>
      </div>
    </AppFrame>
  );
}
