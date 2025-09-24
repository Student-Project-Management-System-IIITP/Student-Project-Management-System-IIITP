// Base model class (to be extended by specific models)
class BaseModel {
  constructor(data = {}) {
    this.data = data;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Common methods for all models
  save() {
    // Implementation will depend on database choice
    console.log('Saving model:', this.data);
  }

  update(data) {
    this.data = { ...this.data, ...data };
    this.updatedAt = new Date();
  }

  delete() {
    // Implementation will depend on database choice
    console.log('Deleting model:', this.data);
  }
}

module.exports = BaseModel;
