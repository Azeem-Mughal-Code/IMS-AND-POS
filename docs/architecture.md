# Architecture & Diagrams (UML)

The following diagrams illustrate the structure, behavior, and interactions within the system.

### 1. Architectural Diagram (C4 Level 2 - Container)
High-level overview of the application container within the browser context.

```mermaid
graph TB
    User((User))
    
    subgraph "Browser / Client Device"
        subgraph "React Application"
            UI[UI Components]
            Context[React Context Providers]
            Services["Service Logic (Sync, Crypto)"]
        end
        
        DB[(IndexedDB / Dexie.js)]
        LocalKey[Memory / Crypto Key]
    end
    
    API["External Sync API (Optional)"]

    User --> UI
    UI --> Context
    Context --> Services
    Services --> DB
    Services --> LocalKey
    Services -.-> API
    
    LocalKey -.->|Encrypts/Decrypts| DB
```

### 2. Context Diagram
System boundary definition.

```mermaid
graph TD
    User(Retail Manager / Cashier)
    System(IMS & POS System)
    Browser(Web Browser)
    
    User -->|Interacts via| Browser
    Browser -->|Hosts| System
    System -->|Stores Data| Browser
```

### 3. Use Case Diagram
Roles and their authorized interactions.

```mermaid
graph LR
    Admin((Admin))
    Cashier((Cashier))

    subgraph "POS Module"
        UC1(Process Sale)
        UC2(Return Item)
        UC3(Open/Close Shift)
    end

    subgraph "Inventory Module"
        UC4(Manage Products)
        UC5(Adjust Stock)
        UC6(Create PO)
    end

    subgraph "Admin Module"
        UC7(View Profit Reports)
        UC8(Manage Users)
        UC9(Configure Settings)
    end

    Cashier --> UC1
    Cashier --> UC2
    Cashier --> UC3
    
    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
```

### 4. Class Diagram
Core domain entities.

```mermaid
classDiagram
    class User {
        +String id
        +String username
        +Role role
        +String encryptedDEK
        +login()
    }

    class Product {
        +String id
        +String sku
        +String name
        +Float retailPrice
        +Float costPrice
        +Int stock
    }

    class Sale {
        +String id
        +String publicId
        +Date date
        +Float total
        +Float profit
        +CartItem[] items
    }

    class CartItem {
        +String productId
        +Int quantity
        +Float price
    }

    class Supplier {
        +String id
        +String name
        +String contact
    }

    class PurchaseOrder {
        +String id
        +String supplierId
        +POItem[] items
        +String status
    }

    Product "1" *-- "0..*" CartItem
    Sale "1" *-- "1..*" CartItem
    Supplier "1" -- "0..*" PurchaseOrder
    User "1" -- "0..*" Sale : Processed By
```

### 5. Component Diagram
React component structure.

```mermaid
graph TD
    App[App.tsx]
    AuthProvider[AuthContext]
    MainLayout[MainLayout]
    
    subgraph "Views"
        Dash[Dashboard]
        POS[POS]
        Inv[Inventory]
        Cust[Customers]
        Rep[Reports]
        Set[Settings]
    end
    
    subgraph "Shared Components"
        Modal
        Pagination
        Toast
    end

    App --> AuthProvider
    AuthProvider --> MainLayout
    MainLayout --> Dash
    MainLayout --> POS
    MainLayout --> Inv
    MainLayout --> Cust
    MainLayout --> Rep
    MainLayout --> Set
    
    POS --> Modal
    Inv --> Modal
    Set --> Modal
```

### 6. Deployment Diagram
Physical deployment architecture.

```mermaid
graph TD
    subgraph "Client Device"
        subgraph "Web Browser"
            SPA[React SPA]
            IDB[(IndexedDB)]
            SW[Service Worker]
        end
    end
    
    subgraph "Server Side"
        Static[Static File Server]
    end

    SPA <-->|HTTPS| Static
```

### 7. Entity-Relationship Diagram (ERD)
Database schema relationships.

```mermaid
erDiagram
    WORKSPACES ||--|{ USERS : contains
    WORKSPACES ||--|{ PRODUCTS : owns
    WORKSPACES ||--|{ SALES : records
    
    PRODUCTS ||--o{ VARIANTS : has
    CATEGORIES ||--|{ PRODUCTS : categorizes
    
    SALES ||--|{ SALE_ITEMS : includes
    PRODUCTS ||--o{ SALE_ITEMS : referenced_by
    
    SUPPLIERS ||--|{ PURCHASE_ORDERS : supplies
    PURCHASE_ORDERS ||--|{ PO_ITEMS : contains
    PRODUCTS ||--o{ PO_ITEMS : referenced_by
```

### 8. Data Flow Diagram (DFD) - Level 1
Data flow for adding a sale.

```mermaid
graph LR
    User[User]
    POS[POS Interface]
    Calc[Calculation Logic]
    Crypto[Encryption Service]
    DB[(IndexedDB)]

    User -->|Selects Products| POS
    POS -->|Cart Data| Calc
    Calc -->|Totals & Profit| POS
    POS -->|Final Sale Data| Crypto
    Crypto -->|Encrypted Payload| DB
    DB -->|Confirmation| POS
    POS -->|Receipt| User
```

### 9. Sequence Diagram
Flow of a successful login event.

```mermaid
sequenceDiagram
    actor User
    participant UI as Login Form
    participant Auth as AuthContext
    participant Crypto as WebCrypto API
    participant DB as IndexedDB

    User->>UI: Enter Username & Password
    UI->>Auth: login(username, password)
    Auth->>DB: getUser(username)
    DB-->>Auth: User Record (Salt, EncryptedKey)
    Auth->>Crypto: deriveKey(password, Salt)
    Crypto-->>Auth: KEK (Key Encryption Key)
    Auth->>Crypto: unwrapKey(EncryptedKey, KEK)
    
    alt Success
        Crypto-->>Auth: DEK (Data Encryption Key)
        Auth->>DB: setEncryptionKey(DEK)
        Auth-->>UI: Success
        UI->>User: Redirect to Dashboard
    else Failure
        Crypto-->>Auth: Error
        Auth-->>UI: Invalid Credentials
    end
```

### 10. Activity Diagram
Inventory Adjustment Workflow.

```mermaid
graph TD
    Start((Start)) --> Browse[Browse Inventory]
    Browse --> Select[Select Product]
    Select --> Action{Action Type?}
    
    Action -->|Edit| EditForm[Open Edit Modal]
    EditForm --> ValidateEdit{Valid?}
    ValidateEdit -->|Yes| SaveEdit[Update DB]
    ValidateEdit -->|No| EditForm
    
    Action -->|Adjust Stock| AdjModal[Open Adjustment Modal]
    AdjModal --> InputReason[Input Qty & Reason]
    InputReason --> SaveAdj[Save History Record]
    SaveAdj --> UpdateStock[Update Product Stock]
    
    SaveEdit --> End((End))
    UpdateStock --> End
```

### 11. State Machine Diagram
Lifecycle of a Purchase Order.

```mermaid
stateDiagram-v2
    [*] --> Pending
    
    Pending --> Partial : Items Received < Ordered
    Pending --> Received : All Items Received
    
    Partial --> Partial : More Items Received
    Partial --> Received : Remaining Items Received
    
    Received --> [*]
```

### 12. Flowchart
Application Initialization and Auth Check.

```mermaid
graph TD
    Start([App Load]) --> CheckSession{Session Exists?}
    
    CheckSession -->|Yes| LoadUser[Load User from DB]
    LoadUser --> ValidateKey{Key Available?}
    
    ValidateKey -->|Yes| App[Render Main App]
    ValidateKey -->|No| Login[Redirect to Login]
    
    CheckSession -->|No| Login
    
    Login --> UserInput[/User Inputs Creds/]
    UserInput --> CryptoCheck{Crypto Challenge}
    
    CryptoCheck -->|Pass| SetKey[Unlock DB Key]
    SetKey --> App
    
    CryptoCheck -->|Fail| Err[Show Error]
    Err --> UserInput
```
