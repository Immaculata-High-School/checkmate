#!/bin/bash

# =============================================================================
# Interactive Admin Account Creator for Checkmate
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           Checkmate Admin Account Creator                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get email
while true; do
    read -p "Enter admin email: " EMAIL
    if [[ "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        break
    else
        echo -e "${RED}Invalid email format. Please try again.${NC}"
    fi
done

# Get name
read -p "Enter admin name: " NAME
if [ -z "$NAME" ]; then
    NAME="Admin"
fi

# Get password with confirmation
while true; do
    read -s -p "Enter password (min 8 characters): " PASSWORD
    echo
    
    if [ ${#PASSWORD} -lt 8 ]; then
        echo -e "${RED}Password must be at least 8 characters.${NC}"
        continue
    fi
    
    read -s -p "Confirm password: " PASSWORD_CONFIRM
    echo
    
    if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
        echo -e "${RED}Passwords do not match. Please try again.${NC}"
    else
        break
    fi
done

# Select platform role
echo ""
echo -e "${YELLOW}Select platform role:${NC}"
echo "  1) PLATFORM_ADMIN (full access)"
echo "  2) SUPPORT (support staff)"
echo "  3) USER (regular user)"
read -p "Enter choice [1-3] (default: 1): " ROLE_CHOICE

case $ROLE_CHOICE in
    2)
        PLATFORM_ROLE="SUPPORT"
        ;;
    3)
        PLATFORM_ROLE="USER"
        ;;
    *)
        PLATFORM_ROLE="PLATFORM_ADMIN"
        ;;
esac

# Confirmation
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "Email:         ${GREEN}$EMAIL${NC}"
echo -e "Name:          ${GREEN}$NAME${NC}"
echo -e "Platform Role: ${GREEN}$PLATFORM_ROLE${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Create this admin account? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Creating admin account...${NC}"

# Create the admin using a Node.js script
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
    const email = '$EMAIL';
    const name = '$NAME';
    const password = '$PASSWORD';
    const platformRole = '$PLATFORM_ROLE';
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log('User already exists with email:', email);
        console.log('Updating to admin role...');
        
        const updated = await prisma.user.update({
            where: { email },
            data: { 
                platformRole: platformRole as any,
                name: name || existing.name
            }
        });
        console.log('User updated successfully!');
        console.log('ID:', updated.id);
        return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            name,
            password: hashedPassword,
            platformRole: platformRole as any,
            emailVerified: true
        }
    });
    
    console.log('Admin account created successfully!');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
}

createAdmin()
    .catch(console.error)
    .finally(() => prisma.\$disconnect());
"

echo ""
echo -e "${GREEN}✓ Done! You can now log in with the admin account.${NC}"
