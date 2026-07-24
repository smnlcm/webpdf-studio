using System.ComponentModel;
using System.Drawing.Drawing2D;

namespace HtmlToPdfGuiV2;

internal sealed class ModernButton : Button
{
    private bool _hovered;
    private bool _pressed;

    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public int CornerRadius { get; set; } = 8;

    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public Color BorderColor { get; set; } = Color.Transparent;

    public ModernButton()
    {
        FlatStyle = FlatStyle.Flat;
        FlatAppearance.BorderSize = 0;
        UseVisualStyleBackColor = false;
        Cursor = Cursors.Hand;
        DoubleBuffered = true;
    }

    protected override void OnMouseEnter(EventArgs eventArgs)
    {
        _hovered = true;
        Invalidate();
        base.OnMouseEnter(eventArgs);
    }

    protected override void OnMouseLeave(EventArgs eventArgs)
    {
        _hovered = false;
        _pressed = false;
        Invalidate();
        base.OnMouseLeave(eventArgs);
    }

    protected override void OnMouseDown(MouseEventArgs eventArgs)
    {
        _pressed = true;
        Invalidate();
        base.OnMouseDown(eventArgs);
    }

    protected override void OnMouseUp(MouseEventArgs eventArgs)
    {
        _pressed = false;
        Invalidate();
        base.OnMouseUp(eventArgs);
    }

    protected override void OnPaintBackground(PaintEventArgs eventArgs)
    {
        eventArgs.Graphics.Clear(
            Parent?.BackColor ?? SystemColors.Control);
    }

    protected override void OnPaint(PaintEventArgs eventArgs)
    {
        var graphics = eventArgs.Graphics;
        graphics.SmoothingMode = SmoothingMode.AntiAlias;

        var bounds = ClientRectangle;
        bounds.Width -= 1;
        bounds.Height -= 1;

        var fillColor = Enabled
            ? BackColor
            : ControlPaint.Light(BackColor, 0.45f);

        if (Enabled && _pressed)
        {
            fillColor = ControlPaint.Dark(fillColor, 0.08f);
        }
        else if (Enabled && _hovered)
        {
            fillColor = ControlPaint.Light(fillColor, 0.08f);
        }

        using var path = CreateRoundedRectangle(bounds, CornerRadius);
        using var fillBrush = new SolidBrush(fillColor);
        graphics.FillPath(fillBrush, path);

        if (BorderColor != Color.Transparent)
        {
            using var borderPen = new Pen(BorderColor);
            graphics.DrawPath(borderPen, path);
        }

        var textColor = Enabled
            ? ForeColor
            : ControlPaint.Light(ForeColor, 0.35f);

        TextRenderer.DrawText(
            graphics,
            Text,
            Font,
            bounds,
            textColor,
            TextFormatFlags.HorizontalCenter |
            TextFormatFlags.VerticalCenter |
            TextFormatFlags.EndEllipsis);
    }

    private static GraphicsPath CreateRoundedRectangle(
        Rectangle rectangle,
        int radius)
    {
        var path = new GraphicsPath();
        var diameter = Math.Max(2, radius * 2);
        var arc = new Rectangle(
            rectangle.Location,
            new Size(diameter, diameter));

        path.AddArc(arc, 180, 90);
        arc.X = rectangle.Right - diameter;
        path.AddArc(arc, 270, 90);
        arc.Y = rectangle.Bottom - diameter;
        path.AddArc(arc, 0, 90);
        arc.X = rectangle.Left;
        path.AddArc(arc, 90, 90);
        path.CloseFigure();
        return path;
    }
}

internal sealed class ModernTabControl : TabControl
{
    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public Color SurfaceColor { get; set; } = Color.White;

    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public Color TextColor { get; set; } = Color.FromArgb(71, 85, 105);

    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public Color AccentColor { get; set; } = Color.FromArgb(37, 99, 235);

    public ModernTabControl()
    {
        DrawMode = TabDrawMode.OwnerDrawFixed;
        SizeMode = TabSizeMode.Fixed;
        ItemSize = new Size(122, 34);
        DoubleBuffered = true;
    }

    protected override void OnDrawItem(DrawItemEventArgs eventArgs)
    {
        var bounds = GetTabRect(eventArgs.Index);
        var selected = eventArgs.Index == SelectedIndex;

        using var background = new SolidBrush(SurfaceColor);
        eventArgs.Graphics.FillRectangle(background, bounds);

        var textColor = selected ? AccentColor : TextColor;
        TextRenderer.DrawText(
            eventArgs.Graphics,
            TabPages[eventArgs.Index].Text,
            Font,
            bounds,
            textColor,
            TextFormatFlags.HorizontalCenter |
            TextFormatFlags.VerticalCenter |
            TextFormatFlags.EndEllipsis);

        if (selected)
        {
            using var accentBrush = new SolidBrush(AccentColor);
            eventArgs.Graphics.FillRectangle(
                accentBrush,
                bounds.Left + 12,
                bounds.Bottom - 3,
                Math.Max(8, bounds.Width - 24),
                3);
        }
    }
}
