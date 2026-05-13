import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Pencil, Trash2, Filter, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, type Customer } from "@/lib/db";

const statusColors: Record<Customer["status"], string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
};

const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(7, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  birthday: z.string().optional(),
  anniversary: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const ITEMS_PER_PAGE = 8;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editCustomer, setEditCustomerState] = useState<Customer | null>(null);
  const [deleteCustomerState, setDeleteCustomerState] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadCustomers() {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCustomers(); }, []);

  const filtered = customers.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const addForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "", birthday: "", anniversary: "", status: "active", notes: "" },
  });

  const editForm = useForm<CustomerFormData>({ resolver: zodResolver(customerSchema) });

  const handleAdd = async (data: CustomerFormData) => {
    setSaving(true);
    try {
      const created = await createCustomer({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        birthday: data.birthday || null,
        anniversary: data.anniversary || null,
        notes: data.notes || null,
        status: data.status,
        tags: [],
      });
      setCustomers((prev) => [created, ...prev]);
      addForm.reset();
      setAddOpen(false);
    } catch (err) {
      console.error("Failed to create customer:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: CustomerFormData) => {
    if (!editCustomer) return;
    setSaving(true);
    try {
      const updated = await updateCustomer(editCustomer.id, {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        birthday: data.birthday || null,
        anniversary: data.anniversary || null,
        notes: data.notes || null,
        status: data.status,
      });
      setCustomers((prev) => prev.map((c) => (c.id === editCustomer.id ? updated : c)));
      setEditCustomerState(null);
    } catch (err) {
      console.error("Failed to update customer:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCustomerState) return;
    try {
      await deleteCustomer(deleteCustomerState.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomerState.id));
      setDeleteCustomerState(null);
    } catch (err) {
      console.error("Failed to delete customer:", err);
    }
  };

  const openEdit = (customer: Customer) => {
    editForm.reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      birthday: customer.birthday ?? "",
      anniversary: customer.anniversary ?? "",
      status: customer.status,
      notes: customer.notes ?? "",
    });
    setEditCustomerState(customer);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-muted-foreground text-sm mt-1">{customers.length} total customers</p>
          </div>
          <Button onClick={() => setAddOpen(true)} data-testid="button-add-customer">
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          {loading ? (
            <div className="flex flex-col gap-2 p-6">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Phone</th>
                      <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Birthday</th>
                      <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Anniversary</th>
                      <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                      <th className="text-right px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {paginated.map((customer, i) => (
                        <motion.tr
                          key={customer.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-foreground">{customer.name}</div>
                            {customer.notes && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-48">{customer.notes}</div>}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">{customer.phone}</td>
                          <td className="px-4 py-4 text-muted-foreground">{formatDate(customer.birthday)}</td>
                          <td className="px-4 py-4 text-muted-foreground">{formatDate(customer.anniversary)}</td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className={`text-xs capitalize ${statusColors[customer.status]}`}>
                              {customer.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => setDeleteCustomerState(customer)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {paginated.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-16">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-10 h-10 text-muted-foreground/30" />
                            <p className="text-sm font-medium text-muted-foreground">
                              {search || filterStatus !== "all" ? "No customers match your filters" : "No customers yet"}
                            </p>
                            {!search && filterStatus === "all" && (
                              <p className="text-xs text-muted-foreground">Click "Add Customer" to get started.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden flex flex-col divide-y divide-border">
                {paginated.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center gap-2">
                    <Users className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No customers yet. Tap "Add Customer" to get started.</p>
                  </div>
                ) : paginated.map((customer) => (
                  <div key={customer.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{customer.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{customer.phone}</div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {customer.birthday && <Badge variant="outline" className="text-xs">🎂 {formatDate(customer.birthday)}</Badge>}
                          {customer.anniversary && <Badge variant="outline" className="text-xs">💍 {formatDate(customer.anniversary)}</Badge>}
                          <Badge variant="outline" className={`text-xs capitalize ${statusColors[customer.status]}`}>{customer.status}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteCustomerState(customer)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
                    <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <CustomerForm form={addForm} onSubmit={handleAdd} submitLabel="Add Customer" saving={saving} />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomerState(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          <CustomerForm form={editForm} onSubmit={handleEdit} submitLabel="Save Changes" saving={saving} />
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deleteCustomerState} onOpenChange={() => setDeleteCustomerState(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Customer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{deleteCustomerState?.name}</span>? This cannot be undone.
          </p>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteCustomerState(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function CustomerForm({ form, onSubmit, submitLabel, saving }: {
  form: ReturnType<typeof useForm<CustomerFormData>>;
  onSubmit: (data: CustomerFormData) => void;
  submitLabel: string;
  saving: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Full Name *</Label>
        <Input placeholder="Alice Johnson" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Phone *</Label>
          <Input placeholder="+1 555-0000" {...register("phone")} />
          {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Email</Label>
          <Input type="email" placeholder="alice@email.com" {...register("email")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Birthday</Label>
          <Input type="date" {...register("birthday")} />
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Anniversary</Label>
          <Input type="date" {...register("anniversary")} />
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Status</Label>
        <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "active" | "inactive")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Notes (optional)</Label>
        <Input placeholder="e.g. Loves carrot cake" {...register("notes")} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
