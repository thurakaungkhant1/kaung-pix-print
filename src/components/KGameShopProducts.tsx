import { Diamond, Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CuratedKGameShopProduct {
  id: number;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  category: string;
  points_value: number;
  kgameshop_product_id?: string | null;
}

export function KGameShopProducts({
  products,
  onSelect,
  onChooseAnother,
}: {
  products: CuratedKGameShopProduct[];
  onSelect: (product: CuratedKGameShopProduct) => void;
  onChooseAnother: () => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 text-center space-y-3">
        <Package className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm font-semibold">Packages are currently unavailable</p>
        <p className="text-xs text-muted-foreground">Admin က ရောင်းချရန်ရွေးထားသော package မရှိသေးပါ။</p>
        <Button size="sm" onClick={onChooseAnother} className="rounded-full">Choose another game</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Diamond className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold">Available Packages</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
          <Zap className="h-3 w-3" /> Wallet payment
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <Button
            key={product.id}
            type="button"
            variant="outline"
            onClick={() => onSelect(product)}
            className="group relative h-auto min-h-32 flex-col items-stretch justify-start overflow-hidden rounded-2xl border-border/60 bg-card p-3 text-left shadow-sm hover:border-primary/50"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Diamond className="h-4 w-4 text-primary" />
            </div>
            <p className="whitespace-normal text-sm font-bold leading-tight text-foreground">{product.name}</p>
            {product.description && <p className="mt-1 line-clamp-2 whitespace-normal text-[10px] text-muted-foreground">{product.description}</p>}
            <div className="mt-auto w-full border-t border-border/50 pt-2">
              <p className="text-sm font-bold tabular-nums text-primary">
                {Number(product.price).toLocaleString()} <span className="text-[10px] font-medium text-muted-foreground">MMK</span>
              </p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}