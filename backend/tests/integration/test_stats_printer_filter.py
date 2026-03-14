"""Integration tests for per-printer filtering on stats and slim endpoints."""

import pytest
from httpx import AsyncClient


class TestStatsFilterByPrinter:
    """GET /archives/stats with printer_id parameter."""

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_stats_unfiltered_includes_all(self, async_client: AsyncClient, printer_factory, archive_factory):
        """Without printer_id, stats include archives from all printers."""
        p1 = await printer_factory(name="Printer A")
        p2 = await printer_factory(name="Printer B")
        await archive_factory(p1.id, filament_used_grams=100.0)
        await archive_factory(p2.id, filament_used_grams=200.0)

        response = await async_client.get("/api/v1/archives/stats")

        assert response.status_code == 200
        result = response.json()
        assert result["total_prints"] == 2
        assert result["total_filament_grams"] == 300.0

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_stats_filtered_by_printer(self, async_client: AsyncClient, printer_factory, archive_factory):
        """With printer_id, stats only include that printer's archives."""
        p1 = await printer_factory(name="Printer A")
        p2 = await printer_factory(name="Printer B")
        await archive_factory(p1.id, filament_used_grams=100.0)
        await archive_factory(p2.id, filament_used_grams=200.0)

        response = await async_client.get(f"/api/v1/archives/stats?printer_id={p1.id}")

        assert response.status_code == 200
        result = response.json()
        assert result["total_prints"] == 1
        assert result["total_filament_grams"] == 100.0

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_stats_filtered_empty_result(self, async_client: AsyncClient, printer_factory, archive_factory):
        """Filtering by a printer with no archives returns zeros."""
        p1 = await printer_factory(name="Printer A")
        p2 = await printer_factory(name="Printer B")
        await archive_factory(p1.id)

        response = await async_client.get(f"/api/v1/archives/stats?printer_id={p2.id}")

        assert response.status_code == 200
        result = response.json()
        assert result["total_prints"] == 0

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_stats_filter_with_date_range(self, async_client: AsyncClient, printer_factory, archive_factory):
        """printer_id works together with date range filters."""
        p1 = await printer_factory(name="Printer A")
        p2 = await printer_factory(name="Printer B")
        await archive_factory(p1.id, filament_used_grams=50.0)
        await archive_factory(p2.id, filament_used_grams=75.0)

        response = await async_client.get(f"/api/v1/archives/stats?printer_id={p1.id}&date_from=2020-01-01")

        assert response.status_code == 200
        result = response.json()
        assert result["total_prints"] == 1
        assert result["total_filament_grams"] == 50.0


class TestSlimFilterByPrinter:
    """GET /archives/slim with printer_id parameter."""

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_slim_unfiltered_returns_all(self, async_client: AsyncClient, printer_factory, archive_factory):
        """Without printer_id, slim returns archives from all printers."""
        p1 = await printer_factory(name="Printer A")
        p2 = await printer_factory(name="Printer B")
        await archive_factory(p1.id, print_name="Print A")
        await archive_factory(p2.id, print_name="Print B")

        response = await async_client.get("/api/v1/archives/slim")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_slim_filtered_by_printer(self, async_client: AsyncClient, printer_factory, archive_factory):
        """With printer_id, slim returns only that printer's archives."""
        p1 = await printer_factory(name="Printer A")
        p2 = await printer_factory(name="Printer B")
        await archive_factory(p1.id, print_name="Print A")
        await archive_factory(p2.id, print_name="Print B")

        response = await async_client.get(f"/api/v1/archives/slim?printer_id={p1.id}")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["print_name"] == "Print A"
        assert data[0]["printer_id"] == p1.id

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_slim_filter_empty_result(self, async_client: AsyncClient, printer_factory, archive_factory):
        """Filtering by a printer with no archives returns empty list."""
        p1 = await printer_factory(name="Printer A")
        p2 = await printer_factory(name="Printer B")
        await archive_factory(p1.id)

        response = await async_client.get(f"/api/v1/archives/slim?printer_id={p2.id}")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
