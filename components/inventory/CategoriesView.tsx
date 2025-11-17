import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { useUIState } from '../context/UIStateContext';
import { Category, CategorySortKeys } from '../../types';
import { Modal } from '../common/Modal';
import { PlusIcon, PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '../Icons';

const CategoryForm: React.FC<{
    category?: Category | null;
    onSubmit: (data: Omit<Category, 'id'>) => { success: boolean, message?: string };
    onCancel: () => void;
}> = ({ category, onSubmit, onCancel }) => {
    const { categories } = useProducts();
    const [formData, setFormData] = useState({
        name: category?.name || '',
        parentId: category?.parentId || null,
    });
    const [error, setError] = useState('');

    const getDescendantIds = (catId: string): string[] => {
        const children = categories.filter(c => c.parentId === catId);
        let ids = children.map(c => c.id);
        children.forEach(child => {
            ids = [...ids, ...getDescendantIds(child.id)];
        });
        return ids;
    };

    const parentCategoryOptions = useMemo(() => {
        if (!category) return categories;
        const descendantIds = getDescendantIds(category.id);
        const forbiddenIds = new Set([category.id, ...descendantIds]);
        return categories.filter(c => !forbiddenIds.has(c.id));
    }, [category, categories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const result = onSubmit(formData);
        if (!result.success) {
            setError(result.message || 'An error occurred.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Parent Category (optional)</label>
                <select name="parentId" value={formData.parentId || 'null'} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700">
                    <option value="null">-- No Parent --</option>
                    {parentCategoryOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{category ? 'Save Changes' : 'Add Category'}</button>
            </div>
        </form>
    );
};

export const CategoriesView: React.FC = () => {
    const { categories, addCategory, updateCategory, deleteCategory } = useProducts();
    const { showToast, categoriesViewState, onCategoriesViewUpdate } = useUIState();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

    const { sortConfig } = categoriesViewState;

    const requestSort = (key: CategorySortKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        onCategoriesViewUpdate({ sortConfig: { key, direction } });
    };

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const hierarchicalCategories = useMemo(() => {
        type CategoryWithChildren = Category & { children: CategoryWithChildren[] };
        const map: Map<string, CategoryWithChildren> = new Map(categories.map(c => [c.id, { ...c, children: [] as CategoryWithChildren[] }]));
        const tree: CategoryWithChildren[] = [];
        
        map.forEach(node => {
            if (node.parentId && map.has(node.parentId)) {
                map.get(node.parentId)!.children.push(node);
            } else {
                tree.push(node);
            }
        });
        
        const { key, direction } = sortConfig;
        const sortNodes = (nodes: CategoryWithChildren[]): CategoryWithChildren[] => {
            nodes.sort((a, b) => {
                const valA = a[key];
                const valB = b[key];
                const comparison = String(valA).localeCompare(String(valB));
                return direction === 'ascending' ? comparison : -comparison;
            });
            nodes.forEach(node => {
                if (node.children.length > 0) {
                    node.children = sortNodes(node.children);
                }
            });
            return nodes;
        };

        return sortNodes(tree);
    }, [categories, sortConfig]);
    
    const handleFormSubmit = (data: Omit<Category, 'id'>) => {
        const result = editingCategory
            ? updateCategory(editingCategory.id, data)
            : addCategory(data);
        if (result.success) {
            showToast(`Category ${editingCategory ? 'updated' : 'added'}.`, 'success');
            setIsModalOpen(false);
            setEditingCategory(null);
        }
        return result;
    };

    const handleDelete = () => {
        if (!deletingCategory) return;
        deleteCategory(deletingCategory.id);
        showToast('Category deleted.', 'success');
        setDeletingCategory(null);
    };

    const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: CategorySortKeys }> = ({ children, sortKey }) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th scope="col" className="px-6 py-3">
                <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1.5 group">
                    <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{children}</span>
                    {isSorted ? (
                        sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                    ) : <ChevronDownIcon className="h-4 w-4 invisible" />}
                </button>
            </th>
        );
    };

    const renderCategoryRows = (cats: (Category & { children: any[] })[], level = 0) => {
        return cats.flatMap(cat => [
            <tr key={cat.id}>
                <td data-label="Name" className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    <span style={{ paddingLeft: `${level * 1.5}rem` }}>{cat.name}</span>
                </td>
                <td data-label="Parent" className="px-6 py-4">{categoryMap.get(cat.parentId || '')?.name || '-'}</td>
                <td data-label="Actions" className="px-6 py-4 flex items-center gap-2 justify-end">
                    <button onClick={() => { setEditingCategory(cat); setIsModalOpen(true); }} className="p-1 text-blue-500 hover:text-blue-700"><PencilIcon /></button>
                    <button onClick={() => setDeletingCategory(cat)} className="p-1 text-red-500"><TrashIcon /></button>
                </td>
            </tr>,
            ...renderCategoryRows(cat.children, level + 1)
        ]);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4">
                <div className="flex justify-end">
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                        <PlusIcon /> Add Category
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
                    <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <SortableHeader sortKey="name">Name</SortableHeader>
                            <th className="px-6 py-3">Parent Category</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderCategoryRows(hierarchicalCategories)}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingCategory(null); }} title={editingCategory ? 'Edit Category' : 'Add Category'}>
                <CategoryForm category={editingCategory} onSubmit={handleFormSubmit} onCancel={() => { setIsModalOpen(false); setEditingCategory(null); }} />
            </Modal>
            <Modal isOpen={!!deletingCategory} onClose={() => setDeletingCategory(null)} title="Confirm Deletion">
                {deletingCategory && (
                    <div>
                        <p>Are you sure you want to delete <span className="font-bold">{deletingCategory.name}</span>?</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Any child categories will become top-level categories. This cannot be undone.</p>
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setDeletingCategory(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};