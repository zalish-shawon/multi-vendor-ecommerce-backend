import { Request, Response } from 'express';
import Category from '../models/Category';

// Create Category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, image } = req.body;
    const slug = name.toLowerCase().replace(/ /g, '-');
    
    const category = new Category({ name, slug, image });
    await category.save();
    
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error });
  }
};

// Update Category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, image } = req.body;
    // If name changes, update slug too
    const updateData: any = { name, image };
    if (name) updateData.slug = name.toLowerCase().replace(/ /g, '-');

    const updated = await Category.findByIdAndUpdate(id, updateData, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error });
  }
};

// Delete Category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category', error });
  }
};

// Get All
export const getAllCategories = async (req: Request, res: Response) => {
    const categories = await Category.find();
    res.json(categories);
};