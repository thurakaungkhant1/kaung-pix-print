import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Terms & Conditions</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <section>
              <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground">
                By accessing and using Kaung Computer's services, you accept and agree to be bound
                by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Use of Service</h3>
              <p className="text-muted-foreground">
                You agree to use our photography and printing services only for lawful purposes and
                in accordance with these Terms.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. Privacy</h3>
              <p className="text-muted-foreground">
                We respect your privacy and are committed to protecting your personal data. Your
                photos and information are stored securely.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Orders and Payment</h3>
              <p className="text-muted-foreground">
                All orders are subject to availability. Prices are subject to change without notice.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Contact</h3>
              <p className="text-muted-foreground">
                For any questions about these Terms, please contact us through the Contact Us page.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
