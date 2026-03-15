import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Category, backendInterface } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

interface Props {
  actor: backendInterface;
}
const emptyForm = { name: "", color: "#6366f1" };

export default function Categories({ actor }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setCategories(await actor.getAllCategories());
    setLoading(false);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: load is recreated each render
  useEffect(() => {
    load();
  }, [actor]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };
  const openEdit = (c: Category) => {
    setForm({ name: c.name, color: c.color });
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId !== null) {
        await actor.updateCategory(editingId, form.name, form.color, false);
      } else {
        await actor.createCategory(form.name, form.color, false);
      }
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this category?")) return;
    await actor.deleteCategory(id);
    load();
  };

  return (
    <div data-ocid="categories.page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button data-ocid="categories.add_button" size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add Category
        </Button>
      </div>

      {loading ? (
        <div
          data-ocid="categories.loading_state"
          className="flex justify-center py-12"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div
          data-ocid="categories.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No categories yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((c, i) => (
            <div
              data-ocid={`categories.item.${i + 1}`}
              key={String(c.id)}
              className="p-4 rounded-xl border bg-card flex items-center gap-3 group hover:shadow-md transition-shadow"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: `${c.color}22`,
                  border: `2px solid ${c.color}`,
                }}
              >
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ background: c.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                {c.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  data-ocid={`categories.edit_button.${i + 1}`}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(c)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                {!c.isDefault && (
                  <Button
                    data-ocid={`categories.delete_button.${i + 1}`}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="categories.dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                data-ocid="categories.name.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Category name"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                  className="w-10 h-10 rounded cursor-pointer border"
                />
                <Input
                  data-ocid="categories.color.input"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              data-ocid="categories.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="categories.save_button"
              onClick={handleSave}
              disabled={saving || !form.name}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
